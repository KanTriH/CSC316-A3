# CSC316 Assignment 3: Interactive Visualization

## 1. Rationale for Design Decisions

**Dataset & Motivation**
I chose to build an interactive storytelling visualization using the "Sleep Health and Lifestyle" dataset. My motivation stems from a desire to explore a deeply relatable narrative: how the combination of high academic stress, physically demanding part-time work, and high caffeine intake directly deteriorates an individual's sleep quality and duration. Instead of attempting to convey every metric, I focused on a compelling subset of the data centered around the physiological cost of high-stress lifestyles.

**Visual Encodings**
* **Initial Approach & Alternatives:** Initially, I considered mapping `Stress Level` and `Quality of Sleep` using a standard Scatter Plot. However, because both variables are discrete integers (1-10 scale), this approach suffered from severe overplotting. I experimented with jittering the data, but it remained visually cluttered and failed to accurately reveal the underlying population density.
* **Ultimate Choice:** To resolve the overplotting and ensure critical data was not hidden, I transitioned to an **Aggregated Grid Matrix**. I utilized `d3.rollup` to group identical coordinate pairs and applied a sequential color scale. By encoding population density through color intensity, the visualization immediately highlights the "high stress, poor sleep" clusters without visual clutter.

**Interaction & Animation Techniques**
* **Multi-view Coordination:** To maintain a tightly-focused design while enabling meaningful exploration, I implemented a details-on-demand interaction. Clicking on any aggregated grid cell acts as a dynamic query filter, triggering a deeper view into that specific cohort.
* **Semantic Zooming & Force Simulation:** Instead of transitioning to a static bar chart, clicking a grid cell triggers a smooth state transition where the macro main view fades out, and the aggregated point "explodes" into a full-screen **Force-Directed Beeswarm Plot**. Each node, representing an individual, is subjected to `d3.forceX` and `d3.forceY` pulls toward distinct foci based on their Sleep Disorder category. The application of `d3.forceCollide` creates a dynamic collision animation, offering an insightful and engaging narrative experience.

## 2. Overview of Development Process

**Working Process & LLM Usage**
The development of this application took approximately **15 to 20 people-hours**. I integrated a Large Language Model (LLM) into my workflow, treating it as a pair-programming partner. I felt extremely comfortable coding like this; the LLM was highly effective in brainstorming conceptual architectures (e.g., pivoting from scatter plots to aggregated matrices) and generating boilerplate code for complex data transformations like nested `d3.rollup`. This allowed me to dedicate more cognitive bandwidth to refining the data storytelling and visual aesthetics rather than debugging D3.js syntax.

**Most Time-Consuming Aspects**
The aspects that required the most time were:
1.  **State Transitions:** Building the seamless, reversible toggle between the macro Grid Matrix and the micro full-screen Force Simulation. Orchestrating the precise timing of the Enter-Update-Exit patterns and opacity transitions for multiple SVG groups to ensure no DOM elements lingered improperly was challenging.
2.  **Physics Tuning:** Fine-tuning the `d3.forceSimulation` parameters. It took significant trial and error to balance the foci pull strength and the collision iterations so that the nodes scattered naturally and settled cleanly without overlapping or escaping the viewport bounds.
