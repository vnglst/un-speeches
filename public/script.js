import { countryLookup } from "./countries.js";

const container = document.getElementById("globe");
const width = container.offsetWidth;
const height = container.offsetHeight;

const sensitivity = 75;
let rotationStopped = false;
let selectedCountry = null;
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

// Enable rotation
svg.call(
  d3
    .drag()
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
    })
);

// Color scales for mentions
const positiveColorScale = d3.scaleSequential(d3.interpolateGreens).domain([0, 20]);
const negativeColorScale = d3.scaleSequential(d3.interpolateReds).domain([0, 20]);

// Load data files
Promise.all([
  d3.json("./topology_with_iso_code.json"),
  d3.json("./positive_received.json"),
  d3.json("./negative_received.json"),
]).then(([topoData, positiveData, negativeData]) => {
  let currentData = positiveData;
  let currentType = "positive";

  function updateMap(data) {
    const countryMentions = {};
    Object.keys(data).forEach((countryCode) => {
      countryMentions[countryCode] = data[countryCode].length;
    });

    const countries = topojson.feature(topoData, topoData.objects.countries);
    const colorScale = currentType === "positive" ? positiveColorScale : negativeColorScale;

    globe
      .selectAll("path")
      .data(countries.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const countryCode = d.properties.code;
        return countryMentions[countryCode] ? colorScale(countryMentions[countryCode]) : "#ccc";
      })
      .attr("stroke", "#000")
      .attr("stroke-width", "0.1")
      .on("mouseover", function (event, d) {
        if (!isDragging) {
          d3.select(this).attr("stroke-width", "1");
        }
      })
      .on("mouseout", function () {
        if (!isDragging) {
          d3.select(this).attr("stroke-width", "0.1");
        }
      })
      .on("click", function (event, d) {
        if (!isDragging) {
          const countryCode = d.properties.code;
          selectedCountry = countryCode;
          rotationStopped = true;
          if (rotationInterval) {
            clearInterval(rotationInterval);
            rotationInterval = null;
          }
          showModal(countryCode, data[countryCode] || [], currentType);
        }
      });
  }

  // Event listener for dropdown
  d3.select("#mentionType").on("change", function () {
    currentType = this.value;
    currentData = currentType === "positive" ? positiveData : negativeData;
    d3.select("#subtitle").text(`${currentType} country mentions`);
    updateMap(currentData);
  });

  function showModal(countryCode, mentions, type) {
    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modal-title");
    const modalSubtitle = document.getElementById("modal-subtitle");
    const modalMentions = document.getElementById("modal-mentions");

    modalTitle.textContent = countryLookup[countryCode] || countryCode;
    modalSubtitle.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} mentions: ${mentions.length}`;

    modalMentions.innerHTML = mentions
      .map((mention) => {
        const countryName = countryLookup[mention.mentioning_country_code] || mention.mentioning_country_code;
        return `
        <div class="mention-item">
          <span class="mentioning-country">${countryName}</span>: 
          "${mention.explanation}"
        </div>
      `;
      })
      .join("");

    modal.style.display = "block";
  }

  // Close modal when clicking the close button
  document.querySelector(".close-button").onclick = function () {
    document.getElementById("modal").style.display = "none";
  };

  // Close modal when clicking outside
  window.onclick = function (event) {
    const modal = document.getElementById("modal");
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  // Initial render and start rotation
  updateMap(currentData);
  startRotation();
});
