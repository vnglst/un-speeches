const width = window.innerWidth;
const height = window.innerHeight;
const sensitivity = 75;
let rotationStopped = false; // Flag to control rotation
let selectedCountry = null; // Track the selected country

const svg = d3.select("#globe").append("svg").attr("width", width).attr("height", height);

const globe = svg.append("g");

let rotation = [-60, -10, 0];
let lastMousePosition = [0, 0];
let isDragging = false;

// Set up projection
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

d3.json("./topology_with_iso_code.json")
  .then(function (data) {
    console.log("Map data received:", data);
    const countries = topojson.feature(data, data.objects.countries);

    globe
      .selectAll("path")
      .data(countries.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "#009edb")
      .attr("stroke", "#fff")
      .on("click", function (event, d) {
        event.stopPropagation();
        if (selectedCountry === d) {
          // Deselect the country
          d3.select("#info").text("");
          d3.selectAll("path").attr("stroke", "#fff").attr("stroke-width", "1px");
          selectedCountry = null;
        } else {
          // Select the country
          const infoDiv = d3.select("#info").html(d.properties.name);
          // make sure label uses full width
          infoDiv.style("width", "100%");

          d3.selectAll("path").attr("stroke", "#fff").attr("stroke-width", "1px");
          d3.select(this).attr("stroke", "#000").attr("stroke-width", "2px");
          d3.select(this).raise();
          selectedCountry = d;
          rotationStopped = true; // Stop rotation when a country is selected
        }
      })
      .append("title")
      .text((d) => d.properties.name);

    console.log("Globe rendering complete");
  })
  .catch(function (error) {
    console.error("Error loading or parsing map data:", error);
    document.body.innerHTML = "<h1>Error: Failed to load or parse map data</h1>";
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
    // Check if rotation is stopped
    const rotate = projection.rotate();
    projection.rotate([rotate[0] + 0.05, rotate[1]]);
    path.projection(projection);
    globe.selectAll("path").attr("d", path);
  }
});

// Deselect country and resume rotation when clicking outside the globe
document.body.addEventListener("click", (event) => {
  if (!event.target.closest("#globe")) {
    d3.select("#info").text("");
    d3.selectAll("path").attr("stroke", "#fff").attr("stroke-width", "1px");
    selectedCountry = null;
  }
});
