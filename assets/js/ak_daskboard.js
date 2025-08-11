// map
var facilityData = {'coords':[70.20349, -148.42633],
                    'hoverText': 'Hypothetical DACS Facility'
                };

var injectionData = {'coords': [70.20023, -148.40982],
                    'hoverText': 'Class VI Injection Well'
                };

var gasData = {'coords': [70.20035, -148.46054],
                'hoverText': 'Gas Plant with CCS'
                };

var windData = [{'coords':[70.20471, -148.40855],
                    'hoverText': 'New Wind Energy Turbine'},
                {'coords': [70.20378, -148.43405],
                    'hoverText': 'New Wind Energy Turbine'},
                {'coords': [70.19342, -148.43593],
                    'hoverText': 'New Wind Energy Facility'}];

var seaWaterData = {'coords': [70.41258, -148.53073],
                'hoverText': 'Seawater Treatment Plant'
                };

var map = L.map('regionalMap').setView(facilityData.coords, 11);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// custom icons
var LeafIcon = L.Icon.extend({
    options: {
        iconSize:     [64, 64], // size of the icon
        // shadowSize:   [50, 64], // size of the shadow
        iconAnchor:   [32, 48], // point of the icon which will correspond to marker's location
        // shadowAnchor: [4, 62],  // the same for the shadow
        popupAnchor:  [-3, -54] // point from which the popup should open relative to the iconAnchor
    }
});

var facilityIcon = new LeafIcon({iconUrl: '../assets/icons/facilityIcon.png'}),
    gasIcon = new LeafIcon({iconUrl: '../assets/icons/gasIcon.png'}),
    windIcon = new LeafIcon({iconUrl: '../assets/icons/windIcon.png'});

// Show markers
addMarkers(facilityData, facilityIcon);
addMarkers(gasData, gasIcon);
addMarkers(seaWaterData, facilityIcon)

windData.forEach(d => addMarkers(d, windIcon));

L.marker(injectionData.coords).addTo(map).bindPopup(injectionData.hoverText);

var pipeline = new L.Polyline([facilityData.coords, injectionData.coords], {
    color: 'blue',
    weight: 5,
    opacity: 0.75,
    smoothFactor: 1
})

var ccsPipeline = new L.Polyline([gasData.coords, injectionData.coords], {
    color: 'blue',
    weight: 5,
    opacity: 0.75,
    smoothFactor: 1
})

map.addLayer(pipeline.bindPopup('Pipeline from Facility to Injection Site'))
map.addLayer(ccsPipeline.bindPopup('Pipeline from Gas Plant to Injection Site'))

function addMarkers(data, custom_icon) {
    L.marker(data.coords, {icon: custom_icon})
        .addTo(map)
        .bindPopup(data.hoverText)
}

// Need markers for eachmain area the cohort mentioned, plus the hypothetical facility

// Change the color based on airquality value for the region: green: good, yellow: warning, red: bad

// Chart size
// set the dimensions and margins of the graph
var margin = {top: 10, right: 30, bottom: 30, left: 50},
    width = 500 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
var controlSVG = d3.select("#controlChart")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

// initialize X axis
var x = d3.scaleTime().range([0, width]);
var xAxis = d3.axisBottom().scale(x);

controlSVG.append('g')
        .attr('transform', `translate(0,${height})`)
        .attr('class', 'myXaxis')

// initialze y axis
var y = d3.scaleLinear().range([height, 0]);
var yAxis = d3.axisLeft().scale(y);

controlSVG.append('g')
        .attr('class', 'myYaxis')

// tooltip
var tooltip = d3.select('#controlChartSection')
  .append('div')
    .attr('class', 'tooltip')

// This allows to find the closest X index of the mouse:
var bisectDate = d3.bisector(d => d.date).left;

const parseDate = d3.timeParse('%Y-%m-%d')

d3.json('data/simulated_dac_data.json').then(function(data) {
        data.forEach(function(d) {
            d.date = parseDate(d.date)
        })
        // Get control means and limits for each key during preconstruction
        var preconstruction_data = data.filter(d => d.phase === "pre-construction")
        const uniqueKeys = new Set(data.flatMap(d => Object.keys(d)))
        var yKeys = [...uniqueKeys].filter(d => !['date', 'phase'].includes(d))
        var controlLimits = {}

        yKeys.forEach(key => {
            let keyMean = d3.mean(preconstruction_data, d => d[key]);

            if (key === 'Caribou Happiness') {
                controlLimits[key] = {'mean': keyMean,
                                    'UCL': null,
                                    'LCL': keyMean - 3 * d3.deviation(preconstruction_data, d => d[key])
                                    }
            }
            else {
                controlLimits[key] = {'mean': d3.mean(preconstruction_data, d => d[key]),
                                    'UCL': keyMean + 3 * d3.deviation(preconstruction_data, d => d[key]),
                                    'LCL': null
                                    }
            }   
        });

        console.log('limits', controlLimits)

        // create buttons for each key
        buttonDiv = d3.select('#controlChartButtons')
        buttonDiv.selectAll('button')
            .data(yKeys)
            .enter()
            .append('button')
            .text(d => d)
            .attr('value', d => d)
            .on('click', function(event, d) {
                console.log('button clicked', d)
                buildControlChart(data, d, controlLimits)
            })

        console.log(uniqueKeys)

        console.log(data)
        
        buildControlChart(data, 'air quality index', controlLimits)

    }).catch(function(error) {
        console.error('Error', error)
    })


// function to build control chart
function buildControlChart(data, y_variable, controlLimits) {
    d3.selectAll('line').remove()
    d3.selectAll('.ccAnnotation').remove()

    x.domain(d3.extent(data, d => d.date));
    controlSVG.selectAll('.myXaxis')
        .transition()
        .duration(3000)
        .call(xAxis);

    console.log(xAxis)

    console.log(d3.extent(data, d => d.date))

    y.domain(d3.extent(data, d => d[y_variable]));
    controlSVG.selectAll('.myYaxis')
        .transition()
        .duration(3000)
        .call(yAxis);

    // marking the phase of the project
    let preconstruction_data = data.filter(d => d.phase === "pre-construction");
    let construction_data = data.filter(d => d.phase === "facility construction")

    controlSVG.append('line')
        .attr('x1', x(d3.max(preconstruction_data, d => d.date)))
        .attr('x2', x(d3.max(preconstruction_data, d => d.date)))
        .attr('y1', y(d3.min(data, d => d[y_variable])))
        .attr('y2', 0)
        .style("stroke", "black") // Set line color
        .style("stroke-width", 1); // Set line thickness

    controlSVG.append('line')
        .attr('x1', x(d3.max(construction_data, d => d.date)))
        .attr('x2', x(d3.max(construction_data, d => d.date)))
        .attr('y1', y(d3.min(data, d => d[y_variable])))
        .attr('y2', 0)
        .style("stroke", "black") // Set line color
        .style("stroke-width", 1); // Set line thickness

    // reference lines for control chart
    var meanReference = controlSVG.append('line');
    meanReference
        .attr('x1', 0)
        .attr('x2', x(d3.max(data, d => d.date)))
        .attr('y1', y(controlLimits[y_variable]['mean']))
        .attr('y2', y(controlLimits[y_variable]['mean']))
        .style("stroke-dasharray", "5,5") // 5 pixels on, 5 pixels off
        .style("stroke", "black") // Set line color
        .style("stroke-width", 2); // Set line thickness

    // annotation for pre construction mean
    controlSVG.append('text')
        .attr('class', 'ccAnnotation')
        .attr('x', width - 150)
        .attr('y', y(controlLimits[y_variable]['mean']) + 20)
        .attr("dy", "0.35em") // Adjust vertical alignment of text
        .text(`Preconstruction Mean: ${Math.round(controlLimits[y_variable]['mean'] * 100) / 100}`) // The actual text content
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", "black");

    // create update selection and bind new data
    var u = controlSVG.selectAll('.cclines')
        .data([data], d => d.date)

    u.join('path')
        .attr('class', 'cclines')
        .attr('d', d3.line()
            .x(d => x(d.date))
            .y(d => y(d[y_variable])))
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2.5)
            .on("mouseover",  () => tooltip.style("opacity", 1))
            .on("mousemove", (event, dataArray) => {
                // definitely used AI for this part LOL
                // 1) find mouse position, invert to a date
                const [mx] = d3.pointer(event);
                const x0 = x.invert(mx);
                // 2) find insertion point in the sorted array
                const i  = bisectDate(dataArray, x0, 1);
                const d0 = dataArray[i - 1];
                const d1 = dataArray[i];
                // 3) pick the closer of the two
                const dClosest = (x0 - d0.date > d1.date - x0) ? d1 : d0;

                console.log('closest', dClosest)
                // 4) now display exactly the fields you want:
                tooltip
                .html(`
                    <strong>${d3.timeFormat("%b %Y")(dClosest.date)}</strong><br/>
                    Phase: ${dClosest.phase}<br/>
                    ${y_variable}: ${dClosest[y_variable]}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top",  (event.pageY - 20) + "px");
            })
            .on("mouseleave", () => tooltip.style("opacity", 0))
            .transition()
            .duration(3000);
}

// pie chart
var pieWidth = 400
var pieHeight = pieWidth

// dummy data
var pieData = {'Carbon Removed': 500, 'Construction Emissions': 150}

buildPieChart(pieData, pieWidth, pieHeight)

function buildPieChart(data, height, width) {
    var radius = Math.min(width, height) / 2 - margin.right

    var svg = d3.select('#pieChart')
        .append('svg')
            .attr('width', width)
            .attr('height', height)
        .append('g')
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    // color scale
    var color = d3.scaleOrdinal()
        .domain(['Carbon Removed', 'Construction Emissions'])
        .range(['#4682B4', '#df5d5cd9'])

    var pie = d3.pie()
        .sort(null)
        .value(d => d[1])

    var dataReady = pie(Object.entries(data))

    var arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius * 0.8)

    var outerArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9)

    svg.selectAll('allSclices')
        .data(dataReady)
        .join('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data[0]))
        .attr('stroke', 'white')
        .attr('stroke-width', '2px')
        .style('opacity', 0.7)

    svg.selectAll('allPolylines')
        .data(dataReady)
        .join('polyline')
            .attr('stroke', 'black')
            .style('fill', 'none')
            .attr('stroke-width', 1)
            .attr('points', function(d) {
                const posA = arc.centroid(d)
                const posB = outerArc.centroid(d)
                const posC = outerArc.centroid(d);
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
                posC[0] = radius * 0.65 * (midangle < Math.PI ? 1 : -1);
                
                return [posA, posB, posC]
            })

    svg.selectAll('allLabels')
            .data(dataReady)
            .join('text')
                .text(d => d.data[0])
                .attr('font-size', 8)
                .attr('transform', function(d) {
                    const pos = outerArc.centroid(d);
                    const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
                    pos[0] = radius * 0.65 * (midangle < Math.PI ? 1 : -1);
                    return `translate(${pos})`;
                })
                .style('text-anchor', function(d) {
                    const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
                    return (midangle < Math.PI ? 'start' : 'end')
    })
}

// resource chart
d3.json('data/simulated_dac_operation_tidy_with_wind.json').then(function(data) {
        data.forEach(function(d) {
            d.date = parseDate(d.date)
        })

        // get uniquue values in metric column
        uniqueMetrics = [...new Set(data.map(d => d.metric))]
        // create buttons for each key
        buttonDiv = d3.select('#facilityChartButtons')
        buttonDiv.selectAll('button')
            .data(uniqueMetrics)
            .enter()
            .append('button')
            .text(d => d)
            .attr('value', d => d)
            .on('click', function(event, d) {
                console.log('button clicked', d)
                buildAreaChart(data, d)
            })
        // populate chart
        buildAreaChart(data, 'CO2')

    }).catch(function(error) {
        console.error('Error', error)
    })

function buildAreaChart(data, metric) {
    // clear previous chart
    d3.selectAll('#facilityChart > *').remove();

    // filter data for metric
    data_filtered = data.filter(d => d.metric == metric);

    // set dimensions
    const margin = {top: 20, right: 30, bottom: 60, left: 75},
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3.select("#facilityChart")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform",
            `translate(${margin.left}, ${margin.top})`);


    const myGroups = [...new Set(data_filtered.map(d => d.sub_metric))]

    const stackedData = d3.stack()
            .keys(d3.union(data_filtered.map(d => d.sub_metric)))
            .value(([,group], key) => group.get(key).value)
            (d3.index(data_filtered, d => d.date, d => d.sub_metric))

    console.log('stacked data', stackedData)
    // initialize X axis
    var x = d3.scaleTime()
                .domain(d3.extent(data_filtered, d => d.date))
                .range([0, width]);
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x).ticks(5))

    // Add Y axis
    var y = d3.scaleLinear()
                .domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
                .range([ height, 0 ]);
            svg.append("g")
                .call(d3.axisLeft(y));

    // color
    switch (metric) {
        case 'energy':
            colorRange = ['#f89c74', '#b3b3b3', '#66c5cc']
            yLabel = 'Energy Use (MWhr)'
            break;
        case 'water':
            colorRange = ['#12086f', '#4cc9f0']
            yLabel = 'Water Use (m3)'
            break;
        case 'CO2':
            colorRange = ['#2A6A9E']
            yLabel = 'Tonnes CO2 Removed'
            break;
    }

    var color = d3.scaleOrdinal()
        .domain(myGroups)
        .range(colorRange);

    const area = d3.area()
        .x(d => x(d.data[0]))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    // tooltip
    // var tooltip = d3.select('#facilityMonitoring')
    // .append('div')
    //     .attr('class', 'tooltip')

    svg.append('g')
        .selectAll()
        .data(stackedData)
        .join('path')
            .attr('fill', d => color(d.key))
            .attr('d', area)
            .style('fill-opacity', 0.9)
        .append('title')
            .text(d => d.key)

    // x label
    svg.append("text")
        .attr("class", "x label") // Optional: for styling with CSS
        .attr("text-anchor", "middle") // Centers the text horizontally
        .attr("x", width / 2) // Positions in the middle of the chart width
        .attr("y", height + margin.bottom) // Adjust 'y' based on your margins and desired position
        .text("Date");

    // y label
    svg.append("text")
        .attr("class", "y label") // Optional: for styling with CSS
        .attr("text-anchor", "middle") // Centers the text vertically after rotation
        .attr("transform", "rotate(-90)") // Rotates the text for vertical display
        .attr("y", -margin.left / 1.5) // Adjust 'y' based on your margins and desired position (after rotation)
        .attr("x", -height / 2) // Adjust 'x' based on your margins and desired position (after rotation)
        .text(yLabel);

    // legend
    // Create legend container
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(x, y)"); // Adjust position as needed

    // Create legend items
    const legendItems = legend.selectAll(".legend-item")
        .data(myGroups)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`); // Position items vertically

    // Add color swatches (e.g., rectangles)
    legendItems.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => color(d))
        .attr('stroke', 'black');

    // Add text labels
    legendItems.append("text")
        .attr("x", 15) // Offset from the rectangle
        .attr("y", 9) // Vertically align with the rectangle
        .text(d => d);
    
}