# CSC316 Assignment 3: Interactive Visualization

## 1. Rationale for Design Decisions

**Dataset & Motivation**
To begin with, I browsed through a large number of datasets on Kaggle and ultimately selected the “Sleep Health and Lifestyle” dataset. I set out to investigate the specific pressures faced by people in different professions and how these pressures directly undermine our sleep quality and duration. By visualizing these pain points, I aim to create a data storytelling experience that fosters a strong sense of empathy and personal connection.

**Visualization Implementation**
To illustrate the varying levels of stress faced by people in different professions, I added a dropdown filter interaction: users can select different occupations (such as doctors, nurses, engineers, and teachers). When switching professions, the bubbles use D3’s `.transition().duration(800)` to smoothly fly to their new positions or fade in and out.
Additionally, when the mouse hovers over a bubble, a carefully designed tooltip pops up, displaying the individual’s physical data: Age, Gender, Heart Rate, and Blood Pressure. This adds a layer of narrative detail.
* **Initial Approach and Alternatives:** Initially, I considered using a standard scatter plot to visualize `Stress Level` and `Sleep Quality`. However, since both variables are discrete integers (on a 1–10 scale), this approach resulted in severe data overlap. I tried jittering the data, but the visualization remained cluttered and failed to accurately display the specific values of individual data points
* **Final Choice:** To resolve the data overlap issue and ensure key data points were not obscured, I adopted a grouped grid matrix. I used `d3.rollup` to group identical coordinate pairs and applied a serialized color scale. Population density is encoded through color saturation. This not only highlights the differences in cluster density associated with “high stress and poor sleep quality” but also avoids visual clutter and interactive overlap.

**Interaction and Animation Techniques**
* **Multi-view Coordination:** To support meaningful exploration while maintaining a highly focused design, I implemented an interaction feature that displays detailed information on demand. Clicking any cluster grid cell acts as a dynamic query filter, triggering a deep view of that specific group.
* **Semantic Zoom and Force-Directed Simulation:** Clicking a grid cell does not switch to a static bar chart but triggers a smooth state transition: the macro main view gradually fades out, and the cluster points “explode” into a full-screen force-directed swarm plot. Each node represents an individual and is guided by `d3.forceX` and `d3.forceY`, moving toward different focal points based on their sleep disorder category. By applying `d3.forceCollide`, dynamic collision animations are generated, making the entire animation more engaging.

## 2. Overview of the Development Process

**Workflow and the Application of Large Language Models**
The development of this application took approximately 15-20 hours. Throughout the workflow, I utilized an LLM as an assistant. The LLM proved extremely efficient in conceptualizing architectural frameworks (such as transitioning from scatter plots to aggregation matrices) and generating template code for complex data transformations like nested `d3.rollup`. This allowed me to focus more of my energy on optimizing data storytelling and visual aesthetics rather than spending time debugging D3.js syntax.

**Most Time-Consuming Steps**
The most time-consuming steps included:
1.  **State Transitions:** Building a seamless and reversible switching mechanism between the macro grid matrix and the micro full-screen force field simulation. Coordinating the “enter-update-exit” patterns of multiple SVG groups and the precise timing of opacity transitions to ensure no DOM elements remained stuck was quite challenging.
2.  **Physics tuning:** Fine-tuning the `d3.forceSimulation` parameters. After extensive trial and error, we finally balanced the gravitational strength and the number of collision iterations, allowing nodes to disperse naturally and settle cleanly—neither overlapping nor extending beyond the viewport boundaries.

