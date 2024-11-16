import { countryLookup } from "./countries.js";

const width = window.innerWidth;
const height = window.innerHeight;
const sensitivity = 75;
let rotationStopped = false;
let selectedCountry = null;

const svg = d3.select("#globe").append("svg").attr("width", width).attr("height", height);

const globe = svg.append("g");

let rotation = [-60, -10, 0];
let lastMousePosition = [0, 0];
let isDragging = false;

const projection = d3
  .geoOrthographic()
  .scale(Math.min(width, height) / 2.5)
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

// Enable rotation
svg.call(
  d3
    .drag()
    .on("start", () => {
      isDragging = true;
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
      rotationStopped = true;
      isDragging = false;
    })
);

// Load both data files
Promise.all([d3.json("./topology_with_iso_code.json"), d3.json("./negative_received.json")])
  .then(([topoData, negativeData]) => {
    // Process negative mentions
    const countryMentions = {};
    Object.keys(negativeData).forEach((countryCode) => {
      countryMentions[countryCode] = negativeData[countryCode].length;
    });

    // Create color scale
    const colorScale = d3
      .scaleLinear()
      .domain([0, d3.max(Object.values(countryMentions))])
      .range(["#ffebee", "#ff0000"]);

    const countries = topojson.feature(topoData, topoData.objects.countries);

    globe
      .selectAll("path")
      .data(countries.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const code = d.properties.code;
        return countryMentions[code] ? colorScale(countryMentions[code]) : "#009edb";
      })
      .attr("stroke", "#fff")
      .on("click", function (event, d) {
        event.stopPropagation();
        if (selectedCountry === d) {
          d3.select("#info").text("");
          d3.selectAll("path").attr("stroke", "#fff").attr("stroke-width", "1px");
          selectedCountry = null;
        } else {
          const code = d.properties.code;
          const mentions = negativeData[code] || [];
          const countryName = d.properties.name;

          // Show modal with mentions
          const modal = document.getElementById("modal");
          const modalTitle = document.getElementById("modal-title");
          const modalSubtitle = document.getElementById("modal-subtitle");
          const modalMentions = document.getElementById("modal-mentions");

          modalTitle.textContent = `${countryName}`;
          modalSubtitle.textContent = `${mentions.length} negative Mentions`;

          const mentionsHTML = mentions
            .map((mention) => {
              const countryName = countryLookup[mention.mentioning_country_code] || mention.mentioning_country_code;
              return `
            <div class="mention-item">
              <div class="mentioning-country">${countryName}</div>
              <p>${mention.explanation}</p>
            </div>
          `;
            })
            .join("");

          modalMentions.innerHTML = mentionsHTML || "<p>No negative mentions found.</p>";
          modal.style.display = "block";

          // Update selected country styling
          d3.selectAll("path").attr("stroke", "#fff").attr("stroke-width", "1px");
          d3.select(this).attr("stroke", "#000").attr("stroke-width", "2px");
          d3.select(this).raise();
          selectedCountry = d;
          rotationStopped = true;
        }
      })
      .append("title")
      .text((d) => {
        const mentions = countryMentions[d.properties.code] || 0;
        return `${d.properties.name}: ${mentions} negative mentions`;
      });
  })
  .catch((error) => {
    console.error("Error loading data:", error);
    document.body.innerHTML = "<h1>Error: Failed to load data</h1>";
  });

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  svg.attr("width", width).attr("height", height);
  projection.translate([width / 2, height / 2]);
  globe.selectAll("path").attr("d", path);
});

// Add stars
const numStars = 100;
const globeEl = document.querySelector("#title");
for (let i = 0; i < numStars; i++) {
  const star = document.createElement("div");
  star.className = "star";
  star.style.width = `${Math.random() * 2 + 1}px`;
  star.style.height = star.style.width;
  star.style.top = `${Math.random() * height}px`;
  star.style.left = `${Math.random() * width}px`;
  document.body.insertBefore(star, globeEl);
}

// Rotate the globe slowly
d3.timer(function (elapsed) {
  if (!rotationStopped) {
    const rotate = projection.rotate();
    projection.rotate([rotate[0] + 0.05, rotate[1]]);
    path.projection(projection);
    globe.selectAll("path").attr("d", path);
  }
});

// Deselect country and resume rotation when clicking outside
document.body.addEventListener("click", (event) => {
  if (!event.target.closest("#globe")) {
    d3.select("#info").text("");
    d3.selectAll("path").attr("stroke", "#fff").attr("stroke-width", "1px");
    selectedCountry = null;
  }
});

// Add modal close functionality
document.querySelector(".close-button").addEventListener("click", () => {
  document.getElementById("modal").style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (event) => {
  const modal = document.getElementById("modal");
  if (event.target === modal) {
    modal.style.display = "none";
  }
});
