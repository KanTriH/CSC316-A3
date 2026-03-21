const width = 1040;
const height = 600;
const margin = { top: 24, right: 30, bottom: 62, left: 72 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const disorderColorMap = {
  None: "#66a3d2",
  Insomnia: "#d78eb6",
  "Sleep Apnea": "#e11d74"
};

const densityStart = "#5b90bb";
const densityEnd = "#e11d74";

const svg = d3.select("#chart").attr("width", width).attr("height", height);
const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().domain([1, 10]).range([0, innerWidth]).nice();
const y = d3.scaleLinear().domain([1, 10]).range([innerHeight, 0]).nice();

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
const microLayer = root.append("g").attr("class", "micro-layer");
const tooltip = d3.select("#tooltip");
const transitionOverlay = d3.select("#transition-overlay");
const chartWrap = document.querySelector(".chart-wrap");
const returnBtn = d3.select("#return-btn");
const overviewElements = root.selectAll(".grid-x, .grid-y, .axis-x, .axis-y, .axis-title");

let allRows = [];
let filteredRows = [];
let currentClusters = [];
let selectedCluster = null;
let microSimulation = null;
let currentState = "overview";

function normalizeRow(d) {
  return {
    personId: d["Person ID"],
    gender: d.Gender,
    age: +d.Age,
    occupation: d.Occupation,
    sleepDuration: +d["Sleep Duration"],
    quality: +d["Quality of Sleep"],
    stress: +d["Stress Level"],
    disorder: d["Sleep Disorder"] || "None"
  };
}

function topNItems(mapData, n) {
  return Array.from(mapData.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => `${name}: ${count}`)
    .join(" | ");
}

function aggregateByCoordinate(rows) {
  const grouped = d3.group(rows, (d) => `${d.stress}-${d.quality}`);
  return Array.from(grouped, ([key, members]) => {
    const [stress, quality] = key.split("-").map(Number);
    const disorderCounts = d3.rollup(members, (v) => v.length, (d) => d.disorder);
    const occupationCounts = d3.rollup(members, (v) => v.length, (d) => d.occupation);
    return {
      key,
      stress,
      quality,
      count: members.length,
      avgSleep: d3.mean(members, (d) => d.sleepDuration) || 0,
      avgAge: d3.mean(members, (d) => d.age) || 0,
      disorderCounts,
      occupationCounts,
      members
    };
  }).sort((a, b) => b.count - a.count);
}

function stopMicroSimulation() {
  if (microSimulation) {
    microSimulation.stop();
    microSimulation = null;
  }
}

function hideTooltip() {
  tooltip.classed("visible", false);
}

function pulseOverlay(mode = "in") {
  const peak = mode === "in" ? 0.42 : 0.3;
  transitionOverlay
    .interrupt()
    .style("opacity", 0)
    .transition()
    .duration(220)
    .ease(d3.easeCubicOut)
    .style("opacity", peak)
    .transition()
    .duration(420)
    .ease(d3.easeCubicInOut)
    .style("opacity", 0);
}

function getCampCenters() {
  return {
    None: { x: innerWidth * 0.2, y: innerHeight * 0.3 },
    Insomnia: { x: innerWidth * 0.5, y: innerHeight * 0.72 },
    "Sleep Apnea": { x: innerWidth * 0.8, y: innerHeight * 0.3 }
  };
}

function renderOverview(rows) {
  currentClusters = aggregateByCoordinate(rows);
  const maxCount = d3.max(currentClusters, (d) => d.count) || 1;
  const radiusScale = d3.scaleSqrt().domain([1, maxCount]).range([14, 38]);
  const densityScale = d3
    .scaleLinear()
    .domain([1, maxCount])
    .range([densityStart, densityEnd])
    .interpolate(d3.interpolateLab);

  const circles = pointLayer.selectAll("circle").data(currentClusters, (d) => d.key);

  circles.exit().transition().duration(260).attr("r", 0).style("opacity", 0).remove();

  const enter = circles
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.stress))
    .attr("cy", (d) => y(d.quality))
    .attr("r", 0)
    .style("opacity", 0)
    .style("stroke", "#edf2ff")
    .style("stroke-width", 1.1)
    .style("cursor", "pointer");

  enter
    .merge(circles)
    .style("pointer-events", "auto")
    .on("mousemove", function (event, d) {
      if (currentState !== "overview") {
        return;
      }
      const dominantDisorder = topNItems(d.disorderCounts, 1) || "N/A";
      const topOccupations = topNItems(d.occupationCounts, 2) || "N/A";
      const fillColor = densityScale(d.count);
      tooltip.html(`
        <div class="tooltip-topline" style="background:${fillColor}"></div>
        <div class="tooltip-title" style="color:${fillColor}">(${d.stress}, ${d.quality}) Cluster</div>
        <div>People: <b>${d.count}</b></div>
        <div>Avg Sleep Duration: <b>${d.avgSleep.toFixed(2)}h</b></div>
        <div>Dominant Disorder: <b>${dominantDisorder}</b></div>
        <div class="tooltip-meta">Top Occupations: ${topOccupations}</div>
      `);

      const [mx, my] = d3.pointer(event, chartWrap);
      tooltip
        .style("left", `${mx + 16}px`)
        .style("top", `${my - 14}px`)
        .style("border-color", `${fillColor}aa`)
        .style("box-shadow", `0 14px 28px ${fillColor}33`)
        .classed("visible", true);
      d3.select(this).style("stroke-width", 2.2);
    })
    .on("mouseleave", function () {
      hideTooltip();
      d3.select(this).style("stroke-width", 1.1);
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      if (currentState === "overview") {
        enterMicroView(d);
      }
    })
    .transition()
    .duration(620)
    .attr("cx", (d) => x(d.stress))
    .attr("cy", (d) => y(d.quality))
    .attr("r", (d) => radiusScale(d.count))
    .style("opacity", 0.72)
    .style("fill", (d) => densityScale(d.count));
}

function enterMicroView(cluster) {
  selectedCluster = cluster;
  currentState = "micro";
  hideTooltip();
  stopMicroSimulation();
  pulseOverlay("in");

  const originX = x(cluster.stress);
  const originY = y(cluster.quality);
  const centers = getCampCenters();
  const nodeR = d3.scaleSqrt().domain([5, 9]).range([3.6, 7.4]);

  overviewElements.transition().duration(420).ease(d3.easeCubicIn).style("opacity", 0);
  pointLayer
    .selectAll("circle")
    .style("pointer-events", "none")
    .transition()
    .duration(420)
    .ease(d3.easeCubicIn)
    .style("opacity", (d) => (d.key === cluster.key ? 0.16 : 0));

  const camps = ["None", "Insomnia", "Sleep Apnea"];
  const campLabels = microLayer.selectAll(".camp-label").data(camps, (d) => d);
  campLabels
    .enter()
    .append("text")
    .attr("class", "camp-label")
    .attr("x", (d) => centers[d].x)
    .attr("y", (d) => centers[d].y - 74)
    .attr("text-anchor", "middle")
    .attr("fill", "#dce5ff")
    .attr("font-size", 14)
    .attr("font-family", "Satoshi, sans-serif")
    .attr("font-weight", 700)
    .style("opacity", 0)
    .text((d) => `${d} (${cluster.disorderCounts.get(d) || 0})`)
    .transition()
    .delay(180)
    .duration(480)
    .ease(d3.easeCubicOut)
    .style("opacity", 1);

  const nodes = cluster.members.map((m) => ({
    ...m,
    x: originX,
    y: originY,
    r: nodeR(m.sleepDuration)
  }));

  const microNodes = microLayer.selectAll(".micro-node").data(nodes, (d) => d.personId);
  microNodes
    .enter()
    .append("circle")
    .attr("class", "micro-node")
    .attr("cx", originX)
    .attr("cy", originY)
    .attr("r", 0)
    .attr("fill", (d) => disorderColorMap[d.disorder] || "#8ba5d6")
    .attr("stroke", "#edf2ff")
    .attr("stroke-width", 0.8)
    .attr("opacity", 0.92)
    .style("cursor", "pointer")
    .on("mousemove", function (event, d) {
      const color = disorderColorMap[d.disorder] || "#8ba5d6";
      tooltip.html(`
        <div class="tooltip-topline" style="background:${color}"></div>
        <div class="tooltip-title" style="color:${color}">${d.occupation}</div>
        <div>Person ID: <b>${d.personId}</b></div>
        <div>Age: <b>${d.age}</b> | Gender: <b>${d.gender}</b></div>
        <div>Sleep Duration: <b>${d.sleepDuration}h</b></div>
        <div class="tooltip-meta">Disorder: ${d.disorder}</div>
      `);
      const [mx, my] = d3.pointer(event, chartWrap);
      tooltip
        .style("left", `${mx + 16}px`)
        .style("top", `${my - 14}px`)
        .style("border-color", `${color}aa`)
        .style("box-shadow", `0 14px 28px ${color}33`)
        .classed("visible", true);
      d3.select(this).attr("stroke-width", 1.7);
    })
    .on("mouseleave", function () {
      hideTooltip();
      d3.select(this).attr("stroke-width", 0.8);
    })
    .transition()
    .duration(260)
    .ease(d3.easeBackOut.overshoot(1.6))
    .attr("r", (d) => d.r);

  const nodeSelection = microLayer.selectAll(".micro-node");
  microSimulation = d3
    .forceSimulation(nodes)
    .alpha(1)
    .alphaDecay(0.04)
    .velocityDecay(0.3)
    .force(
      "x",
      d3
        .forceX((d) => (centers[d.disorder] ? centers[d.disorder].x : centers.None.x))
        .strength(0.18)
    )
    .force(
      "y",
      d3
        .forceY((d) => (centers[d.disorder] ? centers[d.disorder].y : centers.None.y))
        .strength(0.18)
    )
    .force("collide", d3.forceCollide((d) => d.r + 0.9).iterations(2))
    .on("tick", () => {
      nodeSelection
        .attr("cx", (d) => Math.max(d.r, Math.min(innerWidth - d.r, d.x)))
        .attr("cy", (d) => Math.max(d.r, Math.min(innerHeight - d.r, d.y)));
    });

  returnBtn
    .classed("hidden", false)
    .style("opacity", 0)
    .transition()
    .duration(300)
    .ease(d3.easeCubicOut)
    .style("opacity", 1);
}

function exitMicroView(immediate = false) {
  if (!selectedCluster) {
    currentState = "overview";
    return;
  }

  const originX = x(selectedCluster.stress);
  const originY = y(selectedCluster.quality);
  hideTooltip();
  stopMicroSimulation();
  pulseOverlay("out");
  currentState = "overview";

  returnBtn
    .interrupt()
    .transition()
    .duration(immediate ? 0 : 220)
    .ease(d3.easeCubicInOut)
    .style("opacity", 0)
    .on("end", () => returnBtn.classed("hidden", true));

  if (immediate) {
    microLayer.selectAll("*").remove();
  } else {
    microLayer
      .selectAll(".camp-label")
      .transition()
      .duration(220)
      .ease(d3.easeCubicInOut)
      .style("opacity", 0)
      .remove();
    microLayer
      .selectAll(".micro-node")
      .transition()
      .duration(320)
      .ease(d3.easeCubicIn)
      .attr("cx", originX)
      .attr("cy", originY)
      .attr("r", 0)
      .style("opacity", 0)
      .remove();
  }

  overviewElements
    .transition()
    .duration(immediate ? 0 : 360)
    .ease(d3.easeCubicOut)
    .style("opacity", 1);
  pointLayer
    .selectAll("circle")
    .style("pointer-events", "auto")
    .transition()
    .duration(immediate ? 0 : 420)
    .ease(d3.easeCubicOut)
    .style("opacity", 0.72);
}

returnBtn.on("click", () => exitMicroView(false));
svg.on("click", () => {
  hideTooltip();
});

d3.csv("./data/Sleep_health_and_lifestyle_dataset.csv", normalizeRow).then((data) => {
  allRows = data;
  filteredRows = data;

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

  renderOverview(filteredRows);

  select.on("change", function () {
    const selected = this.value;
    filteredRows = selected === "All Occupations" ? allRows : allRows.filter((d) => d.occupation === selected);
    if (currentState === "micro") {
      exitMicroView(true);
    }
    selectedCluster = null;
    renderOverview(filteredRows);
  });
});
