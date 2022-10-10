//namespacing with an IIFE
//
// Maion JS Code for mapXP
//
// Version 1.5, October 10, 2022
//
// Copyright 2022 Daniel M. Ringel
//
// You may use and adapt mapXP for your own purposes, but you must always cite the original M4 article as follows: 
//
// Ringel, D. M. (2022). EXPRESS: Multimarket Membership Mapping. Journal of Marketing Research, 0(0). https://doi.org/10.1177/00222437221110460
//
//
(function networkChart() {

	var width = 1100,
		height = 600,
		padding = [10, 10, 10, 10],
		formatNumberZoom = d3.format(".1f"),
		formatNumberLegend = d3.format(",.2f"),
		formatPercent = d3.format(".0%"),
		minNodeSize = 10,
		maxNodeSize = 18,
		minLinkWidth = 1,
		maxLinkWidth = 5,
		textPadding = 2,
		panelPaddingLateral = 6,
		panelPaddingBottom = 6,
		mainPanelWidthFactor = 0.75,
		lateralPanelWidthFactor = 0.15,
		zoomPanelWidthFactor = 0.1,
		mainPanelHeightFactor = 0.88,
		bottomPanelHeightFactor = 0.12,
		minZoom = 0.3,
		maxZoom = 20,
		zoomDurations = 1000,
		changeDurations = 500,
		defaultOpacity = 0.75,
		zoomTransition = false,
		fontSizeArray = [8, 14], // range of font sizes for object labels on map
		fontColorArray = ["#dddddd", "#000000"],
		linksColor = "#aaa",
		// divergingColors = ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'], // red and green heatmaps
		divergingColors = ["#B72931",	"#E14732",	"#F58255",	"#FCBB73",	"#FEE4A0",	"#E7F5F9",	"#B9DFED",	"#86BCDB",	"#548AC1",	"#174273"],  // colorblind red and blue heatmaps
		reversedDivergingColors = divergingColors.slice().reverse(),
		reversedDivergingColors = divergingColors.slice().reverse(),
	    markerWidth = 10,
		markerHeight = 6;

	var colorsArray = {
		auto1: d3.schemeCategory10,
		auto2: d3.schemeAccent,
		auto3: d3.schemeDark2,
		auto4: d3.schemePaired,
		auto5: d3.schemePastel1,
		auto6: d3.schemePastel2,
		auto7: d3.schemeSet1,
		auto8: d3.schemeSet2,
		auto9: d3.schemeSet3,
	};

	var svg = d3.select("#svgcontainer")
		.append("svg")
		.attr("viewBox", "0 0 " + width + " " + height);

	var tooltip = d3.select("body").append("div")
		.attr("id", "tooltipdiv")
		.style("opacity", 0);

	var defs = svg.append("defs")

	defs.append("marker")
		.attr("id", "arrow")
		.attr("viewBox", "0 -5 20 20")
		.attr("refX", 0)
		.attr("refY", 0)
		.attr("markerWidth", markerWidth)
		.attr("markerHeight", markerHeight)
		.attr("orient", "auto")
		.append("path")
		.attr("d", "M0,-5L10,0L0,5")
		.attr("class", "arrowHead")
		.style("fill", linksColor);

	var mainPanel = {
		main: svg.append("g")
			.attr("class", "mainPanel")
			.attr("transform", "translate(" + padding[3] + "," + padding[0] + ")"),
		width: (width - padding[1] - padding[3] - (2 * panelPaddingLateral)) * mainPanelWidthFactor,
		height: (height - padding[0] - padding[2] - panelPaddingBottom) * mainPanelHeightFactor
	};

	var legendPanel = {
		main: svg.append("g")
			.attr("class", "legendPanel")
			.attr("transform", "translate(" + (padding[3] + mainPanel.width + panelPaddingLateral) + "," + padding[0] + ")"),
		width: (width - padding[1] - padding[3] - (2 * panelPaddingLateral)) * lateralPanelWidthFactor,
		height: (height - padding[0] - padding[2] - panelPaddingBottom) * mainPanelHeightFactor
	};

	var zoomPanel = {
		main: svg.append("g")
			.attr("class", "zoomPanel")
			.attr("transform", "translate(" + (padding[3] + mainPanel.width + (2 * panelPaddingLateral) + legendPanel.width) + "," + padding[0] + ")"),
		width: (width - padding[1] - padding[3] - (2 * panelPaddingLateral)) * zoomPanelWidthFactor,
		height: (height - padding[0] - padding[2] - panelPaddingBottom) * mainPanelHeightFactor,
		padding: 60
	};

	var bottomPanel = {
		main: svg.append("g")
			.attr("class", "bottomPanel")
			.attr("transform", "translate(" + padding[3] + "," + (padding[0] + mainPanel.height + panelPaddingBottom) + ")"),
		width: (width - padding[1] - padding[3] - (2 * panelPaddingLateral)) * mainPanelWidthFactor,
		height: (height - padding[0] - padding[2] - panelPaddingBottom) * bottomPanelHeightFactor,
		padding: 100
	};

	var zoomRect = mainPanel.main.append("rect")
		.attr("id", "zoomRect")
		.attr("width", mainPanel.width)
		.attr("height", mainPanel.height)
		.attr("cursor", "move")
		.style("fill", "none")
		.attr("pointer-events", "all");

	var clipRect = mainPanel.main.append("defs")
		.append("clipPath")
		.attr("id", "clipRect")
		.append("rect")
		.attr("width", mainPanel.width)
		.attr("height", mainPanel.height);

	var xScale = d3.scaleLinear()
		.range([maxNodeSize, mainPanel.width - maxNodeSize]);

	var yScale = d3.scaleLinear()
		.range([maxNodeSize, mainPanel.height - maxNodeSize]);

	var zoomScale = d3.scaleLinear()
		.range([zoomPanel.padding + 16, zoomPanel.height - 26])
		.domain([minZoom, maxZoom]);

	var colorScale = d3.scaleOrdinal();

	var colorQuantitativeScale = d3.scaleQuantile()
		.range(divergingColors);

	var nodeSizeScale = d3.scaleSqrt()
		.range([minNodeSize, maxNodeSize]);

	var linksScale = d3.scaleLinear()
		.range([bottomPanel.padding, bottomPanel.width - bottomPanel.padding]);

	var linksWeightedScale = d3.scaleLinear();

	var linksWidthScale = d3.scaleLinear()
		.range([minLinkWidth, maxLinkWidth]);

	var fontColorScale = d3.scaleSqrt()
		.range(fontColorArray);

	var fontSizeScale = d3.scaleSqrt()
		.range(fontSizeArray);
    
    // Path to meta data file:
	d3.json("meta/metadata.json", function(metadata) {
		var fileName = metadata.find(function(d) {
			return d.features;
		}).features.fileName;
		d3.json(fileName, function(data) {
			draw(data, metadata);
		});
	});

	function draw(data, metadata) {

		var dropdownColorOptions = metadata.filter(function(d) {
			return d.type === "categorical"
		}).map(function(d) {
			return {
				value: d.variable,
				text: d.variableName,
				type: d.type,
				colorArray: typeof d.colorArray === "string" ? colorsArray[d.colorArray] : d.colorArray
			}
		});

		var dropdownSizeOptions = metadata.filter(function(d) {
			return d.type === "quantitative"
		}).map(function(d) {
			return {
				value: d.variable,
				text: d.variableName,
				order: d.colorOrder,
				type: d.type,
				inColorDropdown: d.inColorDropdown
			}
		});

		var colorOptionsValues = {};

		dropdownColorOptions.map(function(d) {
			return d.value
		}).forEach(function(d) {
			colorOptionsValues[d] = [...new Set(data.nodes.map(function(e) {
				return e[d]
			}))].sort(function(a, b) {
				return d3.ascending(a, b)
			})
		});

		var sizeOptionsValues = {};

		dropdownSizeOptions.map(function(d) {
			return d.value
		}).forEach(function(d) {
			sizeOptionsValues[d] = d3.extent(data.nodes, function(e) {
				return e[d]
			})
		});

		dropdownSizeOptions.forEach(function(d) {
			if (d.inColorDropdown) {
				dropdownColorOptions.push(d)
			}
		});

		var tooltipList = metadata.filter(function(d) {
			return d.tooltip === "yes";
		}).sort(function(a, b) {
			return d3.ascending(a.tooltipOrder, b.tooltipOrder)
		});

		var metadataFeatures = metadata.find(function(d) {
			return d.features
		}).features;

		if (metadataFeatures.sameColorPosition === false) {
			dropdownColorOptions.push({
				value: "samecolor",
				text: "Same Color"
			})
		} else {
			dropdownColorOptions.splice(metadataFeatures.sameColorPosition, 0, {
				value: "samecolor",
				text: "Same Color"
			});
		};

		if (metadataFeatures.sameSizePosition === false) {
			dropdownSizeOptions.push({
				value: "samesize",
				text: "Same Size"
			});
		} else {
			dropdownSizeOptions.splice(metadataFeatures.sameSizePosition, 0, {
				value: "samesize",
				text: "Same Size"
			});
		};

		var selectedColor = metadataFeatures.selectedColor;

		var selectedSize = metadataFeatures.selectedSize;

		var pathsPercentage = Math.min(Math.max(0, metadataFeatures.pathsPercentage / 100), 1);

		var chartState = {
			color: selectedColor,
			size: selectedSize,
			showLabels: metadataFeatures.showLabels,
			changeLabels: metadataFeatures.sizeLabels,
			showTooltip: metadataFeatures.showTooltip,
			links: 1 - pathsPercentage,
			colorArray: dropdownColorOptions.find(function(d) {
				return d.value === selectedColor
			}).colorArray,
			type: dropdownColorOptions.filter(function(d) {
				return d.value === selectedColor;
			})[0].type
		};

		d3.select("#labelscheckbox").node().checked = chartState.showLabels;

		d3.select("#changelabelscheckbox").node().checked = chartState.changeLabels;

		d3.select("#tooltipscheckbox").node().checked = chartState.showTooltip;

		var sameSizeRadius = metadata.find(function(d) {
			return d.features;
		}).features.sameSize;

		var sizeSelect = d3.select("#sizemenudiv")
			.append("select");

		var sizeSelectOptions = sizeSelect.selectAll(null)
			.data(dropdownSizeOptions)
			.enter()
			.append("option")
			.attr("value", function(d) {
				return d.value;
			})
			.property("selected", function(d) {
				return d.value === selectedSize
			})
			.text(function(d) {
				return d.text;
			});

		var colorSelect = d3.select("#colormenudiv")
			.append("select");

		var colorSelectOptions = colorSelect.selectAll(null)
			.data(dropdownColorOptions)
			.enter()
			.append("option")
			.attr("value", function(d) {
				return d.value;
			})
			.property("selected", function(d) {
				return d.value === selectedColor
			})
			.text(function(d) {
				return d.text;
			});

		var angle = metadataFeatures.rotateAngle;

		var verticalFlip = metadataFeatures.verticalFlip;

		if (verticalFlip) {
			var yExtent = d3.extent(data.nodes, function(d) {
				return d.y;
			});
			data.nodes.forEach(function(d) {
				d.y = (-d.y) + (yExtent[0] + yExtent[1]);
			});
		};

		rotatePoints(data.nodes, angle);

		data.links.forEach(function(d) {
			d.sourceName = data.nodes[d.source].name;
			d.targetName = data.nodes[d.target].name;
			d.sourceX = data.nodes[d.source].x;
			d.sourceY = data.nodes[d.source].y;
			d.targetX = data.nodes[d.target].x;
			d.targetY = data.nodes[d.target].y;
		});

		var linkType = metadataFeatures.links;

		var linksExtent = d3.extent(data.links, function(d) {
			return d.weight;
		});

		linksWidthScale.domain(linksExtent);

		linksWeightedScale.range(linksExtent);

		var xValues = d3.extent(data.nodes, function(d) {
			return d.x;
		});

		var yValues = d3.extent(data.nodes, function(d) {
			return d.y;
		});

		var aspectRatio = mainPanel.width / mainPanel.height;

		var xExtent = xValues[1] - xValues[0];

		var yExtent = yValues[1] - yValues[0];

		var xScaleDomain = xExtent > yExtent * aspectRatio ?
			xValues :
			[xValues[0] + (xValues[1] - xValues[0]) / 2 - yExtent * aspectRatio / 2, xValues[0] + (xValues[1] - xValues[0]) / 2 + yExtent * aspectRatio / 2];

		var yScaleDomain = yExtent >= xExtent / aspectRatio ?
			yValues :
			[yValues[0] + (yValues[1] - yValues[0]) / 2 - xExtent / aspectRatio / 2, yValues[0] + (yValues[1] - yValues[0]) / 2 + xExtent / aspectRatio / 2];

		xScale.domain(xScaleDomain);

		yScale.domain(yScaleDomain);

		var xScaleZoom = xScale;

		var yScaleZoom = yScale;

		if (chartState.size !== "samesize") {

			nodeSizeScale.domain(sizeOptionsValues[chartState.size]);

			fontColorScale.domain(sizeOptionsValues[chartState.size]);

			fontSizeScale.domain(sizeOptionsValues[chartState.size]);

		};

		var namesArray = data.nodes.map(function(d) {
			return d.name;
		}).sort();

		if (chartState.type === "categorical") {
			colorScale.domain(colorOptionsValues[chartState.color])
				.range(chartState.colorArray);
		}

		data.nodes.sort(function(a, b) {
			return d3.descending(a[chartState.size], b[chartState.size])
		});

		var zoom = d3.zoom()
			.scaleExtent([minZoom, maxZoom])
			.extent([
				[0, 0],
				[mainPanel.width, mainPanel.height]
			])
			.on("zoom", zoomed);

		var initialZoom = metadataFeatures.zoomLevel < minZoom ?
			minZoom : metadataFeatures.zoomLevel > maxZoom ?
			maxZoom : metadataFeatures.zoomLevel;

		mainPanel.main.call(zoom)
			.on("dblclick.zoom", null);

		zoomRect.on("click", function() {
				zoom.scaleTo(mainPanel.main.transition().duration(zoomDurations), 1)
			})
			.on("dblclick", function() {
				mainPanel.main.transition().duration(zoomDurations).call(zoom.transform, d3.zoomIdentity)
			});

		createLegendPanel();

		var linksContainer = mainPanel.main.append("g")
			.attr("class", "linkContainer")
			.attr("clip-path", "url(#clipRect)");

		var nodesContainer = mainPanel.main.append("g")
			.attr("class", "nodesContainer")
			.attr("clip-path", "url(#clipRect)");

		var nodeCircles = nodesContainer.selectAll(null)
			.data(data.nodes)
			.enter()
			.append("circle")
			.attr("cx", function(d) {
				return xScale(d.x)
			})
			.attr("cy", function(d) {
				return yScale(d.y)
			})
			.attr("r", function(d) {
				if (chartState.size === "samesize") {
					return sameSizeRadius;
				} else {
					return nodeSizeScale(d[chartState.size]);
				}
			})
			.style("fill", function(d) {
				if (chartState.color === "samecolor") {
					return "#aaa";
				} else if (chartState.type === "quantitative") {
					return colorQuantitativeScale(d[chartState.color])
				} else {
					return colorScale(d[chartState.color]);
				}
			})
			.style("opacity", defaultOpacity)
			.style("stroke-width", 1)
			.style("stroke", "white");

		var nodeTexts = nodesContainer.selectAll(null)
			.data(data.nodes)
			.enter()
			.append("text")
			.attr("class", "labelText")
			.style("font-size", "12px")
			.style("fill", "darkslategray")
			.attr("x", function(d) {
				return xScale(d.x) + nodeSizeScale(d[chartState.size]) + textPadding;
			})
			.attr("y", function(d) {
				return yScale(d.y)
			})
			.text(function(d) {
				return d.name
			})
			.style("opacity", 0);

		nodeCircles.on("mouseover", function(d) {
				setNodesOpacity(d, this);
				setLinksOpacity(d);
				if (chartState.showTooltip) {
					tooltipText = tooltipList.map(function(e) {
						var unit = e.unit ? e.unit : "";
						var currency = e.currency ? e.currency : "";
						return "<br>" + e.variableName + ": <span>" + currency + d[e.variable] + unit + "</span>";
					}).join("");
					tooltip.html("Name: <span>" + d.name + "</span>" + tooltipText +
							"</span><br><br><img src=./images/" + d.image + ">")
						.style('top', d3.event.pageY - (tooltip.node().getBoundingClientRect().height / 2) + 'px')
						.style('left', d3.event.pageX + 20 + 'px')
						.style("opacity", 0.9);
				};
				var image = tooltip.select("img");
				image.on("error", function() {
					tooltip.selectAll("img").remove();
					if (tooltip.html().indexOf("(no image)") === -1) {
						tooltip.html(tooltip.html() + "(no image)")
					}
				});
			})
			.on("mousemove", function() {
				if (chartState.showTooltip) {
					tooltip.style('top', d3.event.pageY - (tooltip.node().getBoundingClientRect().height / 2) + 'px')
						.style('left', d3.event.pageX + 20 + 'px');
				}
			})
			.on("mouseout", function() {
				nodeCircles.style("opacity", defaultOpacity);
				tooltip.html("").style("opacity", 0);
				restoreLinksOpacity();
				changeLabelsOpacity();
			});

		zoom.scaleTo(mainPanel.main, initialZoom);

		changeLabelsOpacity();

		changeLabelsColorSize();

		createZoomPanel();

		createBottomPanel();

		$(function() {
			$("#searchinput").autocomplete({
				source: namesArray
			});
		});

		d3.select("#searchbutton").on("click", function() {
			var selected = d3.select("#searchinput").node().value;
			var selectedNode = nodeCircles.filter(function(d) {
				return d.name === selected
			});

			var xPos, yPos;

			selectedNode.each(function(d) {
				xPos = d.x;
				yPos = d.y;
			});

			zoomTransition = true;

			zoom.translateTo(mainPanel.main.transition().duration(changeDurations), xScale(xPos), yScale(yPos));

			d3.selectAll(".links").style("opacity", 0);
			nodeCircles.transition()
				.duration(changeDurations)
				.style("opacity", function(e) {
					return e.name === selected ? 1 : 0
				});
			nodeTexts.transition()
				.duration(changeDurations)
				.style("opacity", function(e) {
					if (chartState.showLabels) {
						return e.name === selected ? 1 : 0;
					} else {
						return 0;
					}
				});

			d3.timeout(function() {
				zoomTransition = false;
				createLinks();
				changeLabelsOpacity();
				nodeCircles.transition()
					.duration(changeDurations)
					.style("opacity", defaultOpacity);
			}, 2000);
		});

		d3.select("#labelscheckbox").on("click", function() {
			chartState.showLabels = this.checked;
			changeLabelsOpacity();
		});

		d3.select("#changelabelscheckbox").on("click", function() {
			chartState.changeLabels = this.checked;
			changeLabelsColorSize();
		});

		d3.select("#tooltipscheckbox").on("click", function() {
			chartState.showTooltip = this.checked;
		});

		// inspired by suish's answer in https://stackoverflow.com/questions/57798877/button-for-downloading-svg-in-javascript-html
		d3.select("#downloadbutton").on("click", function() {
			let svg = document.getElementById('svgcontainer').innerHTML;
			let ind = svg.search('<defs>') + 6
			// svg = svg.substring(0, ind) + 'xmlns="http://www.w3.org/2000/svg" ' + svg.substring(ind);
			let app = `<style>  </style>`
			fetch('networkchart.css')
				.then(response => response.text())
				.then(data => {
					app = app.substring(0, 7) + data + app.substring(7);
					svg = svg.substring(0, ind) + app + svg.substring(ind);
					console.log(svg)
					// xmlns="http://www.w3.org/2000/svg"
					ind = svg.search('<svg') + 4
					svg = svg.substring(0, ind) + ' xmlns="http://www.w3.org/2000/svg" ' + svg.substring(ind);
					const blob = new Blob([svg.toString()]);
					const element = document.createElement("a");
					element.download = "MapXP_Export_NumEx_Map.svg";  // define filename for map export
					element.href = window.URL.createObjectURL(blob);
					element.click();
					element.remove();
				});
		});

		sizeSelect.on("change", function() {
			chartState.size = this.value;
			if (chartState.size !== "samesize") {
				nodeCircles.sort(function(a, b) {
					return d3.descending(a[chartState.size], b[chartState.size])
				});
				nodeSizeScale.domain(sizeOptionsValues[chartState.size]);
				fontColorScale.domain(sizeOptionsValues[chartState.size]);
				fontSizeScale.domain(sizeOptionsValues[chartState.size]);
			}
			nodeCircles.transition()
				.duration(changeDurations)
				.attr("r", function(d) {
					if (chartState.size === "samesize") {
						return sameSizeRadius;
					} else {
						return nodeSizeScale(d[chartState.size]);
					}
				});
			changeLabelsColorSize();
			createLinks();
			d3.selectAll(".nodeSizesTitleSpan").text(function(_, i) {
				if (chartState.size === "samesize") {
					return "none"
				} else {
					var smaller = data.nodes.filter(function(e) {
						return e[chartState.size] === nodeSizeScale.domain()[0];
					});
					var bigger = data.nodes.filter(function(e) {
						return e[chartState.size] === nodeSizeScale.domain()[1];
					});
					if (i === 0) {
						return smaller.length === 1 ? smaller[0].name : "multiple products";
					} else {
						return bigger.length === 1 ? bigger[0].name : "multiple products";
					}
				}
			});
			d3.selectAll(".nodeSizesCirclesValues").text(function(_, i) {
				if (chartState.size === "samesize") {
					return ""
				} else {
					var thisObjectSize = metadata.find(function(d) {
						return d.variable === chartState.size;
					});
					var unitSize = thisObjectSize.unit ? thisObjectSize.unit : "";
					var currencySize = thisObjectSize.currency ? thisObjectSize.currency : "";
					return currencySize + formatNumberLegend(nodeSizeScale.domain()[i]) + unitSize;
				}
			});
			d3.selectAll(".nodeSizesCirclesValues").data(nodeSizeScale.domain());
			d3.selectAll(".nodeSizesTitleSpan").data(nodeSizeScale.domain());
			d3.selectAll(".nodeSizesCircles").data(nodeSizeScale.domain());
			d3.selectAll(".nodeSizesCircles").transition()
				.duration(changeDurations)
				.attr("r", function(_, i) {
					if (chartState.size === "samesize") {
						return sameSizeRadius;
					} else {
						return nodeSizeScale(nodeSizeScale.domain()[i])
					}
				});
			d3.select(".sizeTitleValue")
				.text(dropdownSizeOptions.find(function(d) {
					return d.value === chartState.size;
				}).text);
		});

		colorSelect.on("change", function() {
			nodeCircles.attr("pointer-events", "none");
			nodeTexts.attr("pointer-events", "none");

			chartState.color = this.value;
			chartState.type = dropdownColorOptions.filter(function(d) {
				return d.value === chartState.color;
			})[0].type;

			if (chartState.color !== "samecolor" && chartState.type === "categorical") {
				chartState.colorArray = dropdownColorOptions.find(function(d) {
					return d.value === chartState.color
				}).colorArray;
				colorScale.domain(colorOptionsValues[chartState.color])
					.range(chartState.colorArray);
				d3.select(".colorLegendNodata").remove();
				colorsLegend(colorScale.domain());
			} else if (chartState.color !== "samecolor" && chartState.type === "quantitative") {
				d3.select(".colorLegendNodata").remove();
				colorsLegendQuantitative(chartState.color);
			} else {
				d3.selectAll(".colorGroup").remove();
				d3.select("#moreLegend").remove();
				d3.select("#lessLegend").remove();
				legendPanel.main.append("text")
					.attr("x", 0)
					.attr("y", 290)
					.attr("class", "colorLegendNodata legendText2")
					.text("select from color drop-down")
			}

			nodeCircles.transition()
				.duration(changeDurations)
				.style("fill", function(d) {
					if (chartState.color === "samecolor") {
						return "#aaa";
					} else if (chartState.type === "quantitative") {
						return colorQuantitativeScale(d[chartState.color])
					} else {
						return colorScale(d[chartState.color]);
					}
				});

			d3.select(".colorTitleValue")
				.text(dropdownColorOptions.find(function(d) {
					return d.value === chartState.color;
				}).text);

			d3.timeout(function() {
				nodeCircles.attr("pointer-events", "all");
				nodeTexts.attr("pointer-events", "all");
			}, changeDurations)

		});

		d3.select("#flipbutton").on("click", flipChart);

		d3.select("#anglebutton").on("click", function() {
			var selected = Math.round(parseFloat(d3.select("#angleinput").node().value) * 10) / 10;
			if (selected !== selected) return;
			rotateChart(selected);
		});

		function createLegendPanel() {

			var legendTitle = legendPanel.main.append("text")
				.attr("class", "zoomTitle")
				.attr("x", legendPanel.width / 5.25)
				.attr("y", 20)
				.text("Products");

			var sizeTitle = legendPanel.main.append("text")
				.attr("class", "legendText")
				.attr("x", 0)
				.attr("y", 56);

			sizeTitle.append("tspan")
				.attr("class", "legendText")
				.text("Size: ");

			sizeTitle.append("tspan")
				.attr("class", "legendText sizeTitleValue")
				.text(dropdownSizeOptions.find(function(d) {
					return d.value === chartState.size;
				}).text);

			var nodeSizesGroup = legendPanel.main.selectAll(null)
				.data(nodeSizeScale.domain())
				.enter()
				.append("g")
				.attr("class", "nodeSizesGroup")
				.attr("transform", function(_, i) {
					return "translate(0," + (80 + 80 * i) + ")"
				});

			var nodeSizesTitle = nodeSizesGroup.append("text")
				.attr("class", "legendText2")
				.attr("x", 0)
				.text(function(_, i) {
					return i ? "Largest Bubble:" : "Smallest Bubble:"
				})
				.append("tspan")
				.attr("x", 0)
				.attr("dy", "1.3em")
				.attr("class", "nodeSizesTitleSpan")
				.text(function(d, i) {
					if (chartState.size === "samesize") {
						return "none"
					} else {
						var smaller = data.nodes.filter(function(e) {
							return e[chartState.size] === nodeSizeScale.domain()[0];
						});
						var bigger = data.nodes.filter(function(e) {
							return e[chartState.size] === nodeSizeScale.domain()[1];
						});
						if (i === 0) {
							return smaller.length === 1 ? smaller[0].name : "multiple products";
						} else {
							return bigger.length === 1 ? bigger[0].name : "multiple products";
						}
					}
				});

			var nodeSizesCircles = nodeSizesGroup.append("circle")
				.attr("class", "nodeSizesCircles")
				.attr("cx", maxNodeSize)
				.attr("cy", 44)
				.attr("r", function(_, i) {
					if (chartState.size === "samesize") {
						return sameSizeRadius;
					} else {
						return nodeSizeScale(nodeSizeScale.domain()[i])
					}
				})
				.style("fill", "darkgray")
				.on("mouseover", mouseMoveSize)
				.on("mouseout", mouseOut);

			var nodeSizesCirclesValues = nodeSizesGroup.append("text")
				.attr("class", "legendText2 nodeSizesCirclesValues")
				.attr("x", function(d) {
					return maxNodeSize + nodeSizeScale(d) + 4;
				})
				.attr("y", 44)
				.text(function(d) {
					if (chartState.size === "samesize") {
						return ""
					} else {
						var thisObjectSize = metadata.find(function(d) {
							return d.variable === chartState.size;
						});
						var unitSize = thisObjectSize.unit ? thisObjectSize.unit : "";
						var currencySize = thisObjectSize.currency ? thisObjectSize.currency : "";
						return currencySize + formatNumberLegend(d) + unitSize;
					}
				});

			legendPanel.main.selectAll(".nodeSizesCirclesValues, .nodeSizesTitleSpan")
				.on("mouseover", mouseMoveSize)
				.on("mouseout", mouseOut);

			var colorTitle = legendPanel.main.append("text")
				.attr("x", 0)
				.attr("y", 256);

			colorTitle.append("tspan")
				.attr("class", "legendText")
				.text("Color: ");

			colorTitle.append("tspan")
				.attr("class", "legendText colorTitleValue")
				
				.text(dropdownColorOptions.find(function(d) {
					return d.value === chartState.color;
				}).text);

			if (chartState.color !== "samecolor" && chartState.type === "categorical") {
				colorsLegend(colorScale.domain());
			} else if (chartState.color !== "samecolor" && chartState.type === "quantitative") {
				colorsLegendQuantitative(chartState.color);
			} else {
				d3.selectAll(".colorGroup").remove();
				d3.select("#moreLegend").remove();
				d3.select("#lessLegend").remove();
				legendPanel.main.append("text")
					.attr("x", 0)
					.attr("y", 290)
					.attr("class", "colorLegendNodata legendText2")
					.text(" ")
			};

			//end of createLegendPanel
		};

		function createZoomPanel() {

			var zoomTitle = zoomPanel.main.append("text")
				.attr("class", "zoomTitle")
				.attr("x", zoomPanel.width / 2)
				.attr("y", 20)
				.text("Zoom Level");

			var zoomText = zoomPanel.main.selectAll(null)
				.data(["Zoom out", "Zoom in"])
				.enter()
				.append("text")
				.attr("class", "zoomText")
				.attr("x", zoomPanel.width / 2)
				.attr("y", function(_, i) {
					return i ? zoomScale(maxZoom) + 20 : zoomScale(minZoom) - 20;
				})
				.text(function(d) {
					return d
				});

			var zoomLine = zoomPanel.main.append("line")
				.style("stroke", "#ddd")
				.style("stroke-width", 6)
				.style("stroke-linecap", "round")
				.attr("x1", zoomPanel.width / 2)
				.attr("x2", zoomPanel.width / 2)
				.attr("y1", zoomScale(minZoom))
				.attr("y2", zoomScale(maxZoom));

			var zoomLabelsTicks = [minZoom, 1, 5, 10, 15, maxZoom];

			var zoomLabels = zoomPanel.main.selectAll(null)
				.data(zoomLabelsTicks)
				.enter()
				.append("text")
				.attr("class", "zoomText2")
				.attr("x", zoomPanel.width / 2 + 14)
				.attr("y", function(d) {
					return zoomScale(d)
				})
				.text(function(d) {
					return "- " + d
				});

			var zoomRect = zoomPanel.main.append("rect")
				.attr("y", zoomScale(minZoom))
				.attr("x", 0)
				.attr("width", zoomPanel.width)
				.attr("height", zoomScale(maxZoom) - zoomScale(minZoom))
				.attr("opacity", 0)
				.on("click", function() {
					zoom.scaleTo(mainPanel.main, zoomScale.invert(d3.mouse(this)[1]));
				});

			var zoomGroup = zoomPanel.main.append("g")
				.datum({
					yPos: 0
				})
				.attr("class", "zoomGroup")
				.style("cursor", "pointer")
				.attr("transform", function(d) {
					return "translate(" + (zoomPanel.width / 2) + "," + zoomScale(initialZoom) + ")";
				})
				.call(d3.drag()
					.on("drag", dragged));

			var zoomGroupCircle = zoomGroup.append("circle")
				.attr("class", "zoomGroupCircle")
				.attr("r", 12)
				.style("stroke-width", "1px")
				.style("stroke", "#666")
				.style("fill", "white");

			var zoomGroupText = zoomGroup.append("text")
				.attr("class", "zoomText3")
				.text(formatNumberZoom(initialZoom) + "x");

			function dragged(d) {
				d.yPos = d3.event.y < zoomScale.range()[0] ? zoomScale.range()[0] : d3.event.y > zoomScale.range()[1] ? zoomScale.range()[1] : d3.event.y;
				zoom.scaleTo(mainPanel.main, zoomScale.invert(d.yPos));
			};

			//end of createZoomPanel
		};

		function createBottomPanel() {

			var bottomText = bottomPanel.main.selectAll(null)
				.data(["Percent Strongest Relationships", "(based on relationship matrix S)"])
				.enter()
				.append("text")
				//.attr("class", "zoomText")
				//.attr("y", bottomPanel.height / 2)
				.attr("class", function(_, i) {
					return i ? "zoomText3" : "zoomText";
				})
				.attr("x", function(_, i) {
					return i ? linksScale(1) - 300 : linksScale(0) + 300;
				})
				.attr("y", function(_, i) {
					return i ? bottomPanel.height * 0.3 : bottomPanel.height * 0.1;
				})
				.text(function(d) {
					return d
				})

				.append("tspan")
				//.attr("dy", "1.9em")
				.attr("x", function(_, i) {
					return i ? linksScale(1) + 50 : linksScale(0) - 60;
				})
				.attr("y", function(_, i) {
					return i ? bottomPanel.height * 0.6 : bottomPanel.height * 0.6;
				})
				.attr("class", "zoomText")
				.text(function(_, i) {
					return i ? "Show All" : "Show None"
				});

			var bottomLine = bottomPanel.main.append("line")
				.style("stroke", "#ddd")
				.style("stroke-width", 6)
				.style("stroke-linecap", "round")
				.attr("y1", bottomPanel.height * 0.6)
				.attr("y2", bottomPanel.height * 0.6)
				.attr("x1", linksScale(0))
				.attr("x2", linksScale(1));

			var bottomAxis = d3.axisBottom(linksScale)
				.tickValues(d3.range(0, 1.1, 0.1))
				.tickFormat(function(d) {
					return formatPercent(d);
				});

			var bottomAxisGroup = bottomPanel.main.append("g")
				.attr("class", "bottomAxis")
				.attr("transform", "translate(0," + (bottomPanel.height * 0.8) + ")")
				.call(bottomAxis);

			var bottomRect = bottomPanel.main.append("rect")
				.attr("x", linksScale(0))
				.attr("y", 0)
				.attr("height", bottomPanel.height)
				.attr("width", linksScale(1) - linksScale(0))
				.attr("opacity", 0)
				.on("click", function() {
					var pos = linksScale.invert(d3.mouse(this)[0]);
					chartState.links = 1 - pos.toFixed(2);
					bottomGroup.attr("transform", "translate(" + d3.mouse(this)[0] + "," + (bottomPanel.height * 0.6) + ")");
					bottomGroupText.text(formatPercent(pos));
					createLinks();
				});

			var bottomGroup = bottomPanel.main.append("g")
				.datum({
					xPos: 0
				})
				.attr("class", "bottomGroup")
				.style("cursor", "pointer")
				.attr("transform", function(d) {
					return "translate(" + (linksScale(1 - chartState.links)) + "," + (bottomPanel.height * 0.6) + ")";
				})
				.call(d3.drag()
					.on("drag", linksDragged));

			var bottomGroupCircle = bottomGroup.append("circle")
				.attr("class", "bottomGroupCircle")
				.attr("r", 12)
				.style("stroke-width", "1px")
				.style("stroke", "#666")
				.style("fill", "white");

			var bottomGroupText = bottomGroup.append("text")
				.attr("class", "zoomText3")
				.text(formatPercent(1 - chartState.links));

			function linksDragged(d) {
				d.xPos = d3.event.x < linksScale.range()[0] ? linksScale.range()[0] : d3.event.x > linksScale.range()[1] ? linksScale.range()[1] : d3.event.x;
				bottomGroup.attr("transform", "translate(" + d.xPos + "," + (bottomPanel.height * 0.6) + ")");
				bottomGroupText.text(formatPercent(linksScale.invert(d.xPos)));
				chartState.links = 1 - (+linksScale.invert(d.xPos).toFixed(3));
				createLinks();
			};

			//end of createBottomPanel
		};

		function zoomed() {
			var t = d3.event.transform;
			xScaleZoom = t.rescaleX(xScale);
			yScaleZoom = t.rescaleY(yScale);
			nodeCircles.attr("cx", function(d) {
					return xScaleZoom(d.x)
				})
				.attr("cy", function(d) {
					return yScaleZoom(d.y)
				});
			nodeTexts.attr("x", function(d) {
					return chartState.size !== "samesize" ? xScaleZoom(d.x) + nodeSizeScale(d[chartState.size]) + textPadding : xScaleZoom(d.x) + (sameSizeRadius) + textPadding;
				})
				.attr("y", function(d) {
					return yScaleZoom(d.y)
				});
			d3.select(".zoomGroup")
				.attr("transform", "translate(" + (zoomPanel.width / 2) + "," + zoomScale(t.k) + ")");
			d3.select(".zoomText3").text(formatNumberZoom(t.k) + "x");
			changeLabelsOpacity();
			if (!zoomTransition) {
				createLinks()
			};
			//end of zoomed
		};

		function colorsLegend(thisData) {

			var thisObject = metadata.find(function(d) {
				return d.variable === chartState.color;
			});

			var unit = thisObject.unit ? thisObject.unit : "";

			var currency = thisObject.currency ? thisObject.currency : "";

			var page = 0;

			createLegend(page);

			function createLegend(pageNumber) {

				var pageData = thisData.slice(page * 10, page * 10 + 10);

				var initialYPosition = pageNumber === 0 ? 280 : 290;

				var colorGroup = legendPanel.main.selectAll(".colorGroup")
					.data(pageData);

				var colorGroupExit = colorGroup.exit().remove();

				var colorGroupEnter = colorGroup.enter()
					.append("g")
					.attr("class", "colorGroup");

				var colorRectangles = colorGroupEnter.append("rect")
					.attr("width", 24)
					.attr("height", 15)
					.attr("rx", 2)
					.attr("ry", 2)
					.style("stroke", "#ccc");

				var colorLabels = colorGroupEnter.append("text")
					.attr("class", "legendText2")
					.attr("x", 30)
					.attr("dy", "0.8em");

				colorGroup = colorGroupEnter.merge(colorGroup)
					.attr("transform", function(_, i) {
						return "translate(0," + (initialYPosition + 20 * i) + ")";
					});

				colorGroup.select("rect")
					.style("fill", function(d) {
						return colorScale(d)
					})
					.on("mouseover", mouseoverColor)
					.on("mouseout", mouseOut);

				colorGroup.select("text")
					.text(function(d) {
						return currency + d + unit;
					})
					.on("mouseover", mouseoverColor)
					.on("mouseout", mouseOut);

				if (pageNumber > 0 && d3.select("#lessLegend").empty()) {
					legendPanel.main.append("text")
						.attr("class", "legendText2")
						.attr("id", "lessLegend")
						.attr("cursor", "pointer")
						.attr("transform", "translate(0," + (initialYPosition - 10) + ")")
						.text("... back")
				};

				if (pageNumber === 0) {
					d3.select("#lessLegend").remove()
				};

				if ((pageNumber + 1) * 10 < thisData.length && d3.select("#moreLegend").empty()) {
					legendPanel.main.append("text")
						.attr("class", "legendText2")
						.attr("id", "moreLegend")
						.attr("cursor", "pointer")
						.attr("transform", "translate(0," + (initialYPosition + 210) + ")")
						.text("more ...")
				} else if ((pageNumber + 1) * 10 < thisData.length && !d3.select("#moreLegend").empty()) {
					d3.select("#moreLegend").attr("transform", "translate(0," + (initialYPosition + 210) + ")")
				} else {
					d3.select("#moreLegend").remove()
				};

				d3.select("#lessLegend").on("click", function() {
					createLegend(--page);
				});

				d3.select("#moreLegend").on("click", function() {
					createLegend(++page);
				});

			};

			function mouseoverColor(d) {
				d3.selectAll(".links").style("opacity", 0);
				nodeCircles.style("opacity", function(e) {
					return e[chartState.color] === d ? 1 : 0.05
				});
				nodeTexts.interrupt();
				nodeTexts.style("opacity", function(e) {
					if (chartState.showLabels) {
						return e[chartState.color] === d ? 1 : 0.05;
					} else {
						return 0;
					}
				});
			};

			//end of colorsLegend
		};

		function colorsLegendQuantitative(thisOption) {

			d3.select("#lessLegend").remove();
			d3.select("#moreLegend").remove();

			var thisObject = metadata.find(function(d) {
				return d.variable === chartState.color;
			});

			var unit = thisObject.unit ? thisObject.unit : "";

			var currency = thisObject.currency ? thisObject.currency : "";

			var scaleDomain = data.nodes.map(function(d) {
				return d[thisOption]
			}).sort(function(a, b) {
				return a - b;
			});

			colorQuantitativeScale.domain(scaleDomain);

			var order = dropdownColorOptions.find(function(d) {
				return d.value === thisOption
			}).order;

			colorQuantitativeScale.range(order === "ascending" ? divergingColors : reversedDivergingColors)

			var colorGroup = legendPanel.main.selectAll(".colorGroup")
				.data(order === "ascending" ? divergingColors : reversedDivergingColors);

			var colorGroupExit = colorGroup.exit().remove();

			var colorGroupEnter = colorGroup.enter()
				.append("g")
				.attr("class", "colorGroup");

			var colorRectangles = colorGroupEnter.append("rect")
				.attr("width", 24)
				.attr("height", 15)
				.attr("rx", 2)
				.attr("ry", 2)
				.style("stroke", "#ccc");

			var colorLabels = colorGroupEnter.append("text")
				.attr("class", "legendText2")
				.attr("x", 30)
				.attr("dy", "0.8em");

			colorGroup = colorGroupEnter.merge(colorGroup)
				.attr("transform", function(_, i) {
					return "translate(0," + (280 + 20 * i) + ")";
				});

			colorGroup.select("rect")
				.style("fill", function(d) {
					return d;
				})
				.on("mouseover", mouseoverColorQuantitative)
				.on("mouseout", mouseOut)

			colorGroup.select("text")
				.text(function(d) {
					return currency + formatNumberLegend(colorQuantitativeScale.invertExtent(d)[0]) + unit +
						" to " + currency + formatNumberLegend(colorQuantitativeScale.invertExtent(d)[1]) + unit;
				})
				.on("mouseover", mouseoverColorQuantitative)
				.on("mouseout", mouseOut)

			function mouseoverColorQuantitative(d, i, n) {
				d3.selectAll(".links").style("opacity", 0);
				nodeCircles.style("opacity", function(e) {
					if (i === n.length - 1) {
						return e[chartState.color] >= colorQuantitativeScale.invertExtent(d)[0] && e[chartState.color] <= colorQuantitativeScale.invertExtent(d)[1] ? 1 : 0.05
					} else {
						return e[chartState.color] >= colorQuantitativeScale.invertExtent(d)[0] && e[chartState.color] < colorQuantitativeScale.invertExtent(d)[1] ? 1 : 0.05
					};
				});
				nodeTexts.interrupt();
				nodeTexts.style("opacity", function(e) {
					if (chartState.showLabels) {
						if (i === n.length - 1) {
							return e[chartState.color] >= colorQuantitativeScale.invertExtent(d)[0] && e[chartState.color] <= colorQuantitativeScale.invertExtent(d)[1] ? 1 : 0.05
						} else {
							return e[chartState.color] >= colorQuantitativeScale.invertExtent(d)[0] && e[chartState.color] < colorQuantitativeScale.invertExtent(d)[1] ? 1 : 0.05
						};
					} else {
						return 0;
					}
				});
			};

			//end of colorsLegendQuantitative
		};

		function createLinks() {

			var filteredLinks = data.links.filter(function(d) {
				if (chartState.links === 0) {
					return true
				} else {
					return d.weight > linksWeightedScale(chartState.links);
				}
			});

			if (linkType === "arcs" || linkType === "curvededges") {
				createArcs();
			} else if (linkType === "edges") {
				createEdges();
			};

			function createArcs() {

				var links = linksContainer.selectAll(".links")
					.data(filteredLinks);

				var linksExit = links.exit().remove();

				var linksEnter = links.enter()
					.append("path")
					.attr("class", "links")
					.style("stroke", linksColor)
					.style("stroke-width", function(d) {
						return linksWidthScale(d.weight);
					})
					.style("fill", "none")
					.style("opacity", function(d) {
						return linksWidthScale(d.weight) / maxLinkWidth;
					})
					.attr("d", calculatePath);

				if (linkType === "arcs") {
					linksEnter.attr("marker-end", "url(#arrow)")
				};

				links.attr("d", calculatePath)
					.style("stroke-width", function(d) {
						return linksWidthScale(d.weight);
					})
					.style("opacity", function(d) {
						return linksWidthScale(d.weight) / maxLinkWidth;
					});

				d3.selectAll(".links").attr("d", function(d) {

					var markerSize = linksWidthScale(d.weight) * 2.2;

					var sourceObj = data.nodes.filter(function(e) {
						return e.name === d.sourceName
					})[0];

					var targetObj = data.nodes.filter(function(e) {
						return e.name === d.targetName
					})[0];

					var sourceRadius = chartState.size !== "samesize" ? nodeSizeScale(sourceObj[chartState.size]) : sameSizeRadius;

					var targetRadius = chartState.size !== "samesize" ? nodeSizeScale(targetObj[chartState.size]) : sameSizeRadius;

					var totalLength = this.getTotalLength();

					var initialPoint = this.getPointAtLength(sourceRadius);

					var finalPoint = linkType === "curvededges" ?
						this.getPointAtLength(totalLength - targetRadius) :
						this.getPointAtLength(totalLength - targetRadius - markerSize);

					var dx = finalPoint.x - initialPoint.x,
						dy = finalPoint.y - initialPoint.y,
						dr = Math.sqrt(dx * dx + dy * dy);

					return "M" + initialPoint.x + "," + initialPoint.y + "A" + dr + "," + dr + " 0 0,1 " + finalPoint.x + "," + finalPoint.y;
				});

				function calculatePath(d) {
					var dx = xScaleZoom(d.targetX) - xScaleZoom(d.sourceX),
						dy = yScaleZoom(d.targetY) - yScaleZoom(d.sourceY),
						dr = Math.sqrt(dx * dx + dy * dy);
					return "M" + xScaleZoom(d.sourceX) + "," + yScaleZoom(d.sourceY) + "A" + dr + "," + dr + " 0 0,1 " + xScaleZoom(d.targetX) + "," + yScaleZoom(d.targetY);
				};

				//end od createArcs
			};

			function createEdges() {

				var links = linksContainer.selectAll(".links")
					.data(filteredLinks);

				var linksExit = links.exit().remove();

				var linksEnter = links.enter()
					.append("line")
					.attr("class", "links")
					.style("stroke", linksColor)
					.style("stroke-width", function(d) {
						return linksWidthScale(d.weight);
					})
					.style("opacity", function(d) {
						return linksWidthScale(d.weight) / maxLinkWidth;
					});

				links.style("stroke-width", function(d) {
						return linksWidthScale(d.weight);
					})
					.style("opacity", function(d) {
						return linksWidthScale(d.weight) / maxLinkWidth;
					});

				d3.selectAll(".links").each(function(d) {

					var sourceObj = data.nodes.filter(function(e) {
						return e.name === d.sourceName
					})[0];

					var targetObj = data.nodes.filter(function(e) {
						return e.name === d.targetName
					})[0];

					var sourceRadius = chartState.size !== "samesize" ? nodeSizeScale(sourceObj[chartState.size]) : sameSizeRadius;

					var targetRadius = chartState.size !== "samesize" ? nodeSizeScale(targetObj[chartState.size]) : sameSizeRadius;

					var angle = Math.atan2(d.targetY - d.sourceY, d.targetX - d.sourceX);

					d3.select(this).attr("x1", function(d) {
							return xScaleZoom(d.sourceX) + (Math.cos(angle) * sourceRadius)
						})
						.attr("y1", function(d) {
							return yScaleZoom(d.sourceY) + (Math.sin(angle) * sourceRadius)
						})
						.attr("x2", function(d) {
							return xScaleZoom(d.targetX) - (Math.cos(angle) * targetRadius)
						})
						.attr("y2", function(d) {
							return yScaleZoom(d.targetY) - (Math.sin(angle) * targetRadius)
						});

				});

				//end of createEsges
			};

			//end of createLinks
		};

		function setNodesOpacity(node, thisNode) {
			var originalList = data.nodes.filter(function(d) {
				return d.name === node.name;
			}).map(function(d) {
				return d.node_index;
			});
			var connectedList = originalList.slice();
			d3.selectAll(".links").each(function(d) {
				if (originalList.indexOf(d.source) > -1) {
					if (connectedList.indexOf(d.target) === -1) {
						connectedList.push(d.target)
					}
				} else if (originalList.indexOf(d.target) > -1) {
					if (connectedList.indexOf(d.source) === -1) {
						connectedList.push(d.source)
					}
				}
			});
			nodeCircles.style("opacity", function(d) {
				return connectedList.indexOf(d.node_index) > -1 ? 1 : 0.05
			});
			nodeTexts.interrupt();
			nodeTexts.style("opacity", function(d) {
				return connectedList.indexOf(d.node_index) > -1 && chartState.showLabels ? 1 : 0
			});
		};

		function setLinksOpacity(node) {
			var originalList = data.nodes.filter(function(d) {
				return d.name === node.name;
			}).map(function(d) {
				return d.node_index;
			});
			d3.selectAll(".links").style("opacity", function(d) {
				if (originalList.indexOf(d.source) > -1 || originalList.indexOf(d.target) > -1) {
					return linksWidthScale(d.weight) / maxLinkWidth;
				} else {
					return 0;
				}
			});
		};

		function restoreLinksOpacity() {
			d3.selectAll(".links").style("opacity", function(d) {
				return linksWidthScale(d.weight) / maxLinkWidth;
			});
		};

		function changeLabelsOpacity() {
			if (zoomTransition) return;
			nodeTexts.style("opacity", function() {
				return chartState.showLabels ? 1 : 0;
			});
		};

		function changeLabelsColorSize() {
			if (zoomTransition) return;
			nodeTexts.attr("x", function(d) {
					return chartState.size !== "samesize" ? xScaleZoom(d.x) + nodeSizeScale(d[chartState.size]) + textPadding : xScaleZoom(d.x) + (sameSizeRadius) + textPadding;
				})
				.style("fill", function(d) {
					return chartState.changeLabels && chartState.size !== "samesize" ? fontColorScale(d[chartState.size]) : "darkslategray";
				})
				.style("font-size", function(d) {
					return chartState.changeLabels && chartState.size !== "samesize" ? ~~fontSizeScale(d[chartState.size]) + "px" : "14px"
				});
		};

		function mouseMoveSize(d) {
			if (chartState.size === "samesize") return;
			d3.selectAll(".links").style("opacity", 0)
			nodeCircles.style("opacity", function(e) {
				return e[chartState.size] === d ? 1 : 0.05
			});
			nodeTexts.interrupt();
			nodeTexts.style("opacity", function(e) {
				if (chartState.showLabels) {
					return e[chartState.size] === d ? 1 : 0.05;
				} else {
					return 0;
				}
			});
		};

		function mouseOut() {
			nodeCircles.style("opacity", defaultOpacity);
			restoreLinksOpacity();
			changeLabelsOpacity();
		};

		function rotatePoints(dataArray, angle) {

			if (angle % 360 === 0) return;

			var xExtent = d3.extent(dataArray, function(d) {
				return d.x;
			});

			var yExtent = d3.extent(dataArray, function(d) {
				return d.y;
			});

			var centerX = (xExtent[0] + xExtent[1]) / 2;

			var centerY = (yExtent[0] + yExtent[1]) / 2;

			var radians = angle * (Math.PI / 180);

			dataArray.forEach(function(d) {
				d.x = d.x - centerX;
				d.y = d.y - centerY;
			});

			dataArray.forEach(function(d) {
				var tempX = d.x;
				var tempY = d.y;
				d.x = tempX * Math.cos(radians) - tempY * Math.sin(radians);
				d.y = tempY * Math.cos(radians) + tempX * Math.sin(radians);
			});

			dataArray.forEach(function(d) {
				d.x = d.x + centerX;
				d.y = d.y + centerY;
			});

		};

		function flipChart() {

			data.nodes.sort(function(a, b) {
				return a.node_index - b.node_index;
			});

			var yExtent = d3.extent(data.nodes, function(d) {
				return d.y;
			});

			data.nodes.forEach(function(d) {
				d.y = (-d.y) + (yExtent[0] + yExtent[1]);
			});

			data.links.forEach(function(d) {
				d.sourceX = data.nodes[d.source].x;
				d.sourceY = data.nodes[d.source].y;
				d.targetX = data.nodes[d.target].x;
				d.targetY = data.nodes[d.target].y;
			});

			nodeCircles.attr("cx", function(d) {
					return xScaleZoom(d.x)
				})
				.attr("cy", function(d) {
					return yScaleZoom(d.y)
				});

			nodeTexts.attr("x", function(d) {
					return chartState.size !== "samesize" ? xScaleZoom(d.x) + nodeSizeScale(d[chartState.size]) + textPadding : xScaleZoom(d.x) + (sameSizeRadius) + textPadding;
				})
				.attr("y", function(d) {
					return yScaleZoom(d.y)
				});

			if (!zoomTransition) {
				createLinks()
			};

		};

		function rotateChart(angle) {

			data.nodes.sort(function(a, b) {
				return a.node_index - b.node_index;
			});

			rotatePoints(data.nodes, angle);

			data.links.forEach(function(d) {
				d.sourceX = data.nodes[d.source].x;
				d.sourceY = data.nodes[d.source].y;
				d.targetX = data.nodes[d.target].x;
				d.targetY = data.nodes[d.target].y;
			});

			nodeCircles.attr("cx", function(d) {
					return xScaleZoom(d.x)
				})
				.attr("cy", function(d) {
					return yScaleZoom(d.y)
				});

			nodeTexts.attr("x", function(d) {
					return chartState.size !== "samesize" ? xScaleZoom(d.x) + nodeSizeScale(d[chartState.size]) + textPadding : xScaleZoom(d.x) + (sameSizeRadius) + textPadding;
				})
				.attr("y", function(d) {
					return yScaleZoom(d.y)
				});

			if (!zoomTransition) {
				createLinks()
			};

		};

		//end of draw
	};

	//end of networkChart
}())