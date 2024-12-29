import { countryLookup } from "./countries.js";

// Open the about dialog on page load
document.addEventListener("DOMContentLoaded", () => {
  const aboutDialog = document.getElementById("about-dialog");
  aboutDialog.showModal();
});

const container = document.getElementById("globe");
const width = container.offsetWidth;
const height = container.offsetHeight;

const sensitivity = 75;
let rotationStopped = false;
let isDragging = false;
let rotationInterval;

const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
const globe = svg.append("g");
let rotation = [-60, -10, 0];

const projection = d3
  .geoOrthographic()
  .scale(Math.min(width, height) / 2)
  .translate([width / 2, height / 2])
  .rotate(rotation);

const path = d3.geoPath().projection(projection);

const zoom = d3
  .zoom()
  .scaleExtent([0.5, 4]) // [min, max] zoom levels
  .filter(function (event) {
    // Zoom only on wheel events and touch events with more than one touch point
    return (!event.button && event.type === "wheel") || (event.type === "touchstart" && event.touches.length > 1);
  })
  .on("zoom", (event) => {
    projection.scale((event.transform.k * Math.min(width, height)) / 2);
    globe.selectAll("path").attr("d", path);
    globe.selectAll("circle").attr("r", projection.scale());

    // When min zoom level is reached, restart rotation
    if (event.transform.k === 0.5) {
      rotationStopped = false;
      startRotation();
    }
  });

const initialScale = window.innerWidth > 768 ? 0.6 : 0.9;
const initialTransform = d3.zoomIdentity.scale(initialScale);
svg.call(zoom.transform, initialTransform);

const drag = d3
  .drag()
  .filter(function (event) {
    // Drag only on mouse events and touch events with a single touch point
    return (
      (event.type === "mousedown" && event.button === 0) || (event.type === "touchstart" && event.touches.length === 1)
    );
  })
  .on("start", () => {
    isDragging = true;
    rotationStopped = true;
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
  })
  .on("drag", (event) => {
    const rotate = projection.rotate();
    const k = sensitivity / projection.scale();
    projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
    path.projection(projection);
    requestAnimationFrame(() => {
      globe.selectAll("path").attr("d", path);
    });
  })
  .on("end", () => {
    isDragging = false;
    startRotation();
  });

svg.call(zoom).call(drag);

// Add water
globe
  .append("circle")
  .attr("fill", "#fff")
  .attr("stroke", "#000")
  .attr("stroke-width", "0.2")
  .attr("cx", width / 2)
  .attr("cy", height / 2)
  .attr("r", projection.scale());

function startRotation() {
  if (!rotationInterval && !rotationStopped) {
    rotationInterval = setInterval(() => {
      if (!isDragging) {
        const rotate = projection.rotate();
        projection.rotate([rotate[0] + 0.2, rotate[1], rotate[2]]);
        globe.selectAll("path").attr("d", path);
      }
    }, 50);
  }
}

// Color scales for outlooks
const optimisticColorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 20]);
const pessimisticColorScale = d3.scaleSequential(d3.interpolateReds).domain([0, 20]);

// Load data files
Promise.all([
  d3.json("/data/topology_with_iso_code.json"),
  d3.json("/data/optimistic_received.json"),
  d3.json("/data/pessimistic_received.json"),
]).then(([topoData, optimisticData, pessimisticData]) => {
  let currentData = optimisticData;
  let currentType = "optimistic";

  function updateMap(data) {
    const countryOutlooks = {};

    Object.keys(data).forEach((countryCode) => {
      countryOutlooks[countryCode] = data[countryCode].length;
    });

    const countries = topojson.feature(topoData, topoData.objects.countries);
    const colorScale = currentType === "optimistic" ? optimisticColorScale : pessimisticColorScale;

    const countryPaths = globe
      .selectAll("path")
      .data(countries.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const countryCode = d.properties.code;
        return countryOutlooks[countryCode] ? colorScale(countryOutlooks[countryCode]) : "#eee";
      })
      .attr("stroke", "#ccc")
      .attr("stroke-width", "0.2");

    countryPaths
      .on("mouseover", function () {
        d3.select(this).attr("stroke-width", "2");
        d3.select(this).attr("stroke", colorScale(12));
        d3.select(this).raise();
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", "0.2");
        d3.select(this).attr("stroke", "#ccc");
      })
      .on("click", function (_event, d) {
        if (!isDragging) {
          rotationStopped = true;
          if (rotationInterval) {
            clearInterval(rotationInterval);
            rotationInterval = null;
          }
          const countryCode = d.properties.code;
          showModal(countryCode, data[countryCode] || [], currentType);
        }
      });

    // Clear previous titles
    countryPaths.selectAll("title").remove();

    countryPaths.append("title").text((d) => {
      const mentions = countryOutlooks[d.properties.code];

      if (!mentions) {
        return `${d.properties.name}`;
      }

      return `${d.properties.name}: ${mentions} ${currentType} mentions`;
    });
  }

  // Event listener for dropdown
  d3.select("#mentionType").on("change", function () {
    currentType = this.value;
    currentData = currentType === "optimistic" ? optimisticData : pessimisticData;
    updateMap(currentData);
  });

  function showModal(countryCode, mentions, type) {
    const dialog = document.getElementById("mentions-dialog");
    const modalTitle = document.getElementById("modal-title");
    const modalSubtitle = document.getElementById("modal-subtitle");
    const modalOutlooks = document.getElementById("modal-mentions");

    modalTitle.textContent = countryLookup[countryCode] || countryCode;
    modalSubtitle.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} mentions: ${mentions.length}`;

    modalOutlooks.innerHTML = mentions
      .map((mention) => {
        const countryName = countryLookup[mention.mentioning_country_code] || mention.mentioning_country_code;
        return `
        <div class="mention-item">
          <span class="mentioning-country">${countryName}</span>: 
          ${mention.explanation}
        </div>
      `;
      })
      .join("");

    dialog.showModal();
  }

  // Add stars
  const numStars = 100;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const starsContainer = document.getElementById("stars-container");

  for (let i = 0; i < numStars; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.width = `${Math.random() * 2 + 1}px`;
    star.style.height = star.style.width;
    star.style.top = `${Math.random() * windowHeight}px`;
    star.style.left = `${Math.random() * windowWidth}px`;
    starsContainer.appendChild(star);
  }

  // Initial render and start rotation
  updateMap(currentData);
  startRotation();
});
