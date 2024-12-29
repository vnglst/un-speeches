import { countryLookup } from "./countries.js";

// Constants
const SENSITIVITY = 75;
const ROTATION_SPEED = 0.2;
const ZOOM_EXTENT = [0.5, 4];
const INITIAL_SCALE = window.innerWidth > 768 ? 0.6 : 0.9;
const STAR_COUNT = 100;

// State Variables
let rotationStopped = false;
let isDragging = false;
let rotationInterval;

// Initialize the globe
document.addEventListener("DOMContentLoaded", () => {
  const aboutDialog = document.getElementById("about-dialog");
  aboutDialog.showModal();

  const aboutBtn = document.getElementById("about-btn");
  aboutBtn.addEventListener("click", () => {
    aboutDialog.showModal();
  });

  const container = document.getElementById("globe");
  const { width, height } = container.getBoundingClientRect();

  const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
  const globe = svg.append("g");
  const projection = createProjection(width, height);
  const path = d3.geoPath().projection(projection);

  setupZoom(svg, projection, path, globe, width, height);
  setupDrag(svg, projection, path, globe);
  addWater(globe, projection, width, height);
  addStars();

  loadDataAndRender(globe, path, projection);
});

// Create the D3 projection
function createProjection(width, height) {
  return d3
    .geoOrthographic()
    .scale(Math.min(width, height) / 2)
    .translate([width / 2, height / 2])
    .rotate([-60, -10, 0]);
}

// Setup zoom behavior
function setupZoom(svg, projection, path, globe, width, height) {
  const zoom = d3
    .zoom()
    .scaleExtent(ZOOM_EXTENT)
    .filter(
      (event) => (!event.button && event.type === "wheel") || (event.type === "touchstart" && event.touches.length > 1)
    )
    .on("zoom", (event) => {
      projection.scale((event.transform.k * Math.min(width, height)) / 2);
      globe.selectAll("path").attr("d", path);
      globe.selectAll("circle").attr("r", projection.scale());

      if (event.transform.k === ZOOM_EXTENT[0]) {
        rotationStopped = false;
        startRotation(projection, path, globe);
      }
    });

  const initialTransform = d3.zoomIdentity.scale(INITIAL_SCALE);
  svg.call(zoom.transform, initialTransform);
  svg.call(zoom);
}

// Setup drag behavior
function setupDrag(svg, projection, path, globe) {
  const drag = d3
    .drag()
    .filter(
      (event) =>
        (event.type === "mousedown" && event.button === 0) ||
        (event.type === "touchstart" && event.touches.length === 1)
    )
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
      const k = SENSITIVITY / projection.scale();
      projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
      path.projection(projection);
      requestAnimationFrame(() => {
        globe.selectAll("path").attr("d", path);
      });
    })
    .on("end", () => {
      isDragging = false;
      startRotation(projection, path, globe);
    });

  svg.call(drag);
}

// Add water to the globe
function addWater(globe, projection, width, height) {
  globe
    .append("circle")
    .attr("fill", "#fff")
    .attr("stroke", "#000")
    .attr("stroke-width", "0.2")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", projection.scale());
}

// Start the globe rotation
function startRotation(projection, path, globe) {
  if (!rotationInterval && !rotationStopped) {
    rotationInterval = setInterval(() => {
      if (!isDragging) {
        const rotate = projection.rotate();
        projection.rotate([rotate[0] + ROTATION_SPEED, rotate[1], rotate[2]]);
        globe.selectAll("path").attr("d", path);
      }
    }, 50);
  }
}

// Load data and render the map
function loadDataAndRender(globe, path, projection) {
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
      const colorScale =
        currentType === "optimistic"
          ? d3.scaleSequential(d3.interpolateBlues).domain([0, 20])
          : d3.scaleSequential(d3.interpolateReds).domain([0, 20]);

      const countryPaths = globe
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("fill", (d) =>
          countryOutlooks[d.properties.code] ? colorScale(countryOutlooks[d.properties.code]) : "#eee"
        )
        .attr("stroke", "#ccc")
        .attr("stroke-width", "0.2");

      countryPaths
        .on("mouseover", function () {
          d3.select(this).attr("stroke-width", "2").attr("stroke", colorScale(12)).raise();
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke-width", "0.2").attr("stroke", "#ccc");
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

      countryPaths.selectAll("title").remove();
      countryPaths.append("title").text((d) => {
        const mentions = countryOutlooks[d.properties.code];
        return mentions ? `${d.properties.name}: ${mentions} ${currentType} mentions` : `${d.properties.name}`;
      });
    }

    d3.select("#mentionType").on("change", function () {
      currentType = this.value;
      currentData = currentType === "optimistic" ? optimisticData : pessimisticData;
      updateMap(currentData);
    });

    updateMap(currentData);
    startRotation(projection, path, globe);
  });
}

// Show modal with country mentions
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
      return `<div class="mention-item"><span class="mentioning-country">${countryName}</span>: ${mention.explanation}</div>`;
    })
    .join("");

  dialog.showModal();
}

// Add stars to the background
function addStars() {
  const starsContainer = document.getElementById("stars-container");
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  for (let i = 0; i < STAR_COUNT; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.width = `${Math.random() * 2 + 1}px`;
    star.style.height = star.style.width;
    star.style.top = `${Math.random() * windowHeight}px`;
    star.style.left = `${Math.random() * windowWidth}px`;
    starsContainer.appendChild(star);
  }
}
