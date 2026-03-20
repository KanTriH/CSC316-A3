const width = 1040;
const height = 600;
const margin = { top: 24, right: 30, bottom: 62, left: 72 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const colorMap = {
  None: "#66a3d2",
  Insomnia: "#d78eb6",
  "Sleep Apnea": "#e11d74"
};

const svg = d3.select("#chart").attr("width", width).attr("height", height);

const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().domain([1, 10]).range([0, innerWidth]).nice();
const y = d3.scaleLinear().domain([1, 10]).range([innerHeight, 0]).nice();
const r = d3.scaleSqrt().domain([4.5, 9]).range([6, 24]);

const xAxis = d3.axisBottom(x).ticks(10).tickFormat(d3.format("d"));
const yAxis = d3.axisLeft(y).ticks(10).tickFormat(d3.format("d"));

root
  .append("g")
  .attr("class", "grid-x")
  .attr("transform", `translate(0,${innerHeight})`)
  .call(d3.axisBottom(x).ticks(10).tickSize(-innerHeight).tickFormat(""))
  .call((g) => g.selectAll("line").attr("stroke", "#334155").attr("stroke-opacity", 0.55))
  .call((g) => g.select(".domain").remove());

root
  .append("g")
  .attr("class", "grid-y")
  .call(d3.axisLeft(y).ticks(10).tickSize(-innerWidth).tickFormat(""))
  .call((g) => g.selectAll("line").attr("stroke", "#334155").attr("stroke-opacity", 0.55))
  .call((g) => g.select(".domain").remove());

root
  .append("g")
  .attr("class", "axis-x")
  .attr("transform", `translate(0,${innerHeight})`)
  .call(xAxis)
  .call((g) => g.selectAll("line,path").attr("stroke", "#3b4e7d"));

root
  .append("g")
  .attr("class", "axis-y")
  .call(yAxis)
  .call((g) => g.selectAll("line,path").attr("stroke", "#3b4e7d"));

root
  .append("text")
  .attr("class", "axis-title")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 46)
  .attr("text-anchor", "middle")
  .text("Stress Level");

root
  .append("text")
  .attr("class", "axis-title")
  .attr("x", -innerHeight / 2)
  .attr("y", -48)
  .attr("transform", "rotate(-90)")
  .attr("text-anchor", "middle")
  .text("Quality of Sleep");

const pointLayer = root.append("g").attr("class", "points");
const tooltip = d3.select("#tooltip");
const chartWrap = document.querySelector(".chart-wrap");
const goldenAngle = 2.399963229728653;
const jitterStep = 7.5;
const jitterMax = 34;

function getBubbleX(d) {
  return Math.max(0, Math.min(innerWidth, x(d.stress) + d.jitterX));
}

function getBubbleY(d) {
  return Math.max(0, Math.min(innerHeight, y(d.quality) + d.jitterY));
}

function normalizeRow(d) {
  const personId = d["Person ID"];
  return {
    personId,
    gender: d.Gender,
    age: +d.Age,
    occupation: d.Occupation,
    sleepDuration: +d["Sleep Duration"],
    quality: +d["Quality of Sleep"],
    stress: +d["Stress Level"],
    disorder: d["Sleep Disorder"] || "None",
    heartRate: d["Heart Rate"] || null,
    bloodPressure: d["Blood Pressure"] || null,
    jitterX: 0,
    jitterY: 0
  };
}

function assignClusterJitter(data) {
  const groups = d3.group(data, (d) => `${d.stress}-${d.quality}`);
  groups.forEach((points) => {
    points.sort((a, b) => (+a.personId || 0) - (+b.personId || 0));
    points.forEach((d, i) => {
      if (i === 0) {
        d.jitterX = 0;
        d.jitterY = 0;
        return;
      }
      const radius = Math.min(jitterMax, Math.sqrt(i) * jitterStep);
      const angle = i * goldenAngle;
      d.jitterX = Math.cos(angle) * radius;
      d.jitterY = Math.sin(angle) * radius;
    });
  });
}

function render(filteredData) {
  const bubbles = pointLayer.selectAll("circle").data(filteredData, (d) => d.personId);

  bubbles
    .exit()
    .transition()
    .duration(800)
    .attr("r", 0)
    .style("opacity", 0)
    .remove();

  const enter = bubbles
    .enter()
    .append("circle")
    .attr("cx", (d) => getBubbleX(d))
    .attr("cy", innerHeight + 40)
    .attr("r", 0)
    .style("opacity", 0)
    .style("stroke", "#f3f5ff")
    .style("stroke-width", 1)
    .style("cursor", "pointer");

  enter
    .merge(bubbles)
    .on("mousemove", function (event, d) {
      const hr = d.heartRate ? d.heartRate : "N/A (Data unavailable)";
      const bp = d.bloodPressure ? d.bloodPressure : "N/A (Data unavailable)";
      const disorderColor = colorMap[d.disorder] || "#66a3d2";
      tooltip.html(`
            <div class="tooltip-topline" style="background:${disorderColor}"></div>
            <div class="tooltip-title" style="color:${disorderColor}">${d.occupation}</div>
            <div>Age: <b>${d.age}</b></div>
            <div>Gender: <b>${d.gender}</b></div>
            <div>Heart Rate: <b>${hr}</b></div>
            <div>Blood Pressure: <b>${bp}</b></div>
            <div class="tooltip-meta">Sleep: ${d.sleepDuration}h | Stress: ${d.stress} | Quality: ${d.quality}</div>
          `);

      const [mx, my] = d3.pointer(event, chartWrap);
      tooltip
        .style("left", `${mx + 16}px`)
        .style("top", `${my - 14}px`)
        .style("border-color", `${disorderColor}aa`)
        .style("box-shadow", `0 14px 28px ${disorderColor}33`)
        .classed("visible", true);

      d3.select(this).style("stroke-width", 2.2);
    })
    .on("mouseleave", function () {
      tooltip.classed("visible", false);
      d3.select(this).style("stroke-width", 1);
    })
    .transition()
    .duration(800)
    .attr("cx", (d) => getBubbleX(d))
    .attr("cy", (d) => getBubbleY(d))
    .attr("r", (d) => r(d.sleepDuration))
    .style("opacity", 0.6)
    .style("fill", (d) => colorMap[d.disorder] || "#38bdf8");
}

d3.csv("./data/Sleep_health_and_lifestyle_dataset.csv", normalizeRow).then((data) => {
  assignClusterJitter(data);
  const allOccupations = Array.from(new Set(data.map((d) => d.occupation))).sort(d3.ascending);
  const select = d3.select("#occupation-filter");
  const options = ["All Occupations", ...allOccupations];

  select
    .selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  render(data);

  select.on("change", function () {
    const selected = this.value;
    const filtered = selected === "All Occupations" ? data : data.filter((d) => d.occupation === selected);
    render(filtered);
  });
});
