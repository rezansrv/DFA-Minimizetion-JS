// تنظیمات نمایش گراف با Sigma
const settings = {
minArrowSize: 8,
	autoRescale: false,
	defaultEdgeType: "arrow",
	arrowSizeRatio: 10,
	defaultEdgeLabelColor: "black",
	defaultEdgeColor: "red",
	defaultNodeColor: "#007FFF",
	defaultLabelColor: "black",
	edgeLabelSize: 'proportional',
	defaultEdgeLabelSize: 20,
	minNodeSize: 5,
	maxNodeSize: 20,
	minEdgeSize: 0.1,
	maxEdgeSize: 2,
	edgeColor: 'default',
	doubleClickEnabled: false,
	enableHovering: false,
	mouseWheelEnabled: false
}

var ID = -2,
	selectedNode = null,
	edgeType = "arrow"

const s = new sigma({
	settings,
	renderer: {
		container: document.getElementById('canvas'),
		type: 'canvas'
	},
})
// بروزرسانی
sigma.classes.graph.attach('addNode', 'incrementIDAndRefresh', () => {
	ID++
	s.refresh()
})

sigma.classes.graph.attach('addEdge', 'incrementIDAndMergeAndRefresh', (data) => {
	ID++
	const edgesRelated = []
	if (data.source === data.target && data.type !== "curvedArrow")
		s.graph.edges(data.id).type = "curvedArrow"
	s.graph.edges().forEach(edge => {
		if (edge.target == data.source && edge.source == data.target) {
			s.graph.edges(data.id).type = "curvedArrow"
			edge.type = "curvedArrow"
		}
		if (edge.source === data.source && edge.target === data.target && edge.label)
			edgesRelated.push(edge)
	})
	let i = edgesRelated.length - 1
	while (i > 0) {
		if (edgesRelated.reduce((acc, current) => acc + (edgesRelated[i].label && edgesRelated[i].label === current.label ? 1 : 0), 0) < 2)
			s.graph.edges(edgesRelated[0].id).label += ", " + s.graph.edges(edgesRelated[i].id).label
		s.graph.edges(edgesRelated[i].id).label = null
		i--
	}
	s.refresh()
})

sigma.classes.graph.attach('dropNode', 'refresh', () => {
	s.refresh()
})

s.bind("doubleClickStage", e => {
	try {
		if (e.data.captor.ctrlKey) {
			if ($("#labelInput").val()) {
				s.graph.addNode({
					id: ID + "",
					label: $("#labelInput").val(),
					x: e.data.captor.x * s.camera.ratio,
					y: e.data.captor.y * s.camera.ratio,
					size: 15
				})
				ID === 0 && s.graph.addEdge({
					id: "-1",
					source: "-2",
					target: "-1",
					size: 1,
					type: "arrow"
				})
				selectedNode = null
				$("#labelInput").val("")
			}
			$("#labelInput").focus()
		}
	} catch (e) {
		console.error(e)
	}
})

s.bind('doubleClickNode', e => {
	try {
		if (e.data.captor.ctrlKey && e.data.node.id != -2) {
			if ($("#labelInput").val()) {
				if (selectedNode !== null) {
					s.graph.addEdge({
						id: ID + "",
						label: $("#labelInput").val(),
						usedLabel: $("#labelInput").val(),
						source: selectedNode,
						target: e.data.node.id,
						type: edgeType
					})
					selectedNode = null
				} else
					selectedNode = e.data.node.id
			}
			$("#labelInput").focus()
		} else if (e.data.captor.altKey && e.data.node.id != -2) {
			s.graph.nodes(e.data.node.id).color = s.graph.nodes(e.data.node.id).color == "#41FFC9" ? "#007FFF" : "#41FFC9"
			s.refresh()
		}
	} catch (e) {
		console.error(e)
	}
})

s.bind('rightClickNode', e => {
	if (e.data.captor.ctrlKey && e.data.node.id != -2 && e.data.node.id != -1) {
		s.graph.dropNode(e.data.node.id)
	}
})

$(window).on("contextmenu", () => false)

function updateEdgesType() {
	edgeType = $("input[name='edges']:checked").val()
	s.graph.edges().forEach(edge => edge.type = edge.source === "-2" && edge.target === "-1" ? 'arrow' : edge.source == edge.target ? 'curvedArrow' : edgeType)
	s.refresh()
}

// حذف گره های غیر قابل دسترس
const removeUnreachableStates = () => {
	let edges = s.graph.edges(),
		passed = {
			"-2": true
		},
		currentLeaves = {},
		filterResult = {}

	edges = edges.filter(edge => {
		if (passed[edge.source] && edge.source !== edge.target) {
			currentLeaves[edge.target] = true
			return false
		}
		return true
	})

	while (Object.keys(currentLeaves).length) {
		edges = edges.filter(edge => {
			if (currentLeaves[edge.source] && edge.source !== edge.target) {
				filterResult[edge.target] = true
				return false
			}
			return true
		})
		passed = {
			...passed,
			...currentLeaves
		}
		currentLeaves = filterResult
		filterResult = {}
	}

	let nodesToBeRemoved = s.graph.nodes().filter(node => !passed[node.id])
	//nodesToBeRemoved.forEach(node => s.graph.nodes(node.id).color = "red")
	nodesToBeRemoved.forEach(node => s.graph.dropNode(node.id))
	s.refresh()
}
    // تقسیم گره‌ها بر اساس رنگ
const _partition = (nodes, color) => {
	const resArray = [
		[],
		[]
	]
	for (node of nodes)
	node.color == color ? resArray[1].push(node) : resArray[0].push(node)
	return resArray
}

    // اجرای عملیات تقسیم گره‌ها
const partitionNodes = () => {
	removeUnreachableStates()
	let edges = s.graph.edges(),
	nodes = s.graph.nodes().filter(node => node.id !== "-2")
	transitions = {},
	partitions = []
	try {
		let alphabets
		edges.forEach(edge => {
			if (!edge.usedLabel) return
			if (!transitions[edge.source])
			transitions[edge.source] = {}
			transitions[edge.source][edge.usedLabel] = edge.target
		})
		
		alphabets = Object.keys(transitions["-1"])
		partitions = _partition(nodes, "#41FFC9")
		let partitionTester,
			currentPartition,
			belongToSamePartition = true,
			partition
		
		do {
			partitionTester = [...partitions]
			for (let pIndex = 0; pIndex < partitions.length; pIndex++) {
				partition = partitions[pIndex]
				initialPartitions = _.cloneDeep(partitions)
				for (let i = 1; i < partition.length; i++) {
					belongToSamePartition = true
					for (letter of alphabets) {
						currentPartition = initialPartitions.find(arr => arr.includes(arr.find(obj => obj.id == transitions[partition[i].id][letter])))
						if (!currentPartition.find(obj => obj.id == transitions[partition[0].id][letter])) {
							belongToSamePartition = false
							break
						}
					}
					if (!belongToSamePartition) {
						let newPartition = partition.splice(i, 1)
						for (let j = i; j < partition.length; j++) {
							belongToSamePartition = true
							for (letter of alphabets) {
								let found = initialPartitions.find(arr => arr.includes(arr.find(obj => obj.id == transitions[newPartition[0].id][letter])))
								currentPartition = found || partition
								if (!found && newPartition.find(obj => obj.id == transitions[partition[j].id][letter]))
									continue
								if (!currentPartition.find(obj => obj.id == transitions[partition[j].id][letter])) {
									belongToSamePartition = false
									break
								}
							}
							if (belongToSamePartition) {
								newPartition.push(...partition.splice(j, 1))
								j--
							}
						}
						partitions.splice(pIndex, 0, newPartition)
						pIndex++
					}
				}
			}
		} while (!_.isEqual(partitionTester, partitions))

		partitions.forEach(arr => {
			let edgeReplacement = {}
			for (let i = 1; i < arr.length; i++) {
				s.graph.edges().forEach(edge => {
					if (edge.target != arr[i].id && edge.source != arr[i].id)
						return
					edgeReplacement = {...edge}
					if (edge.target == arr[i].id)
						edgeReplacement.target = arr[0].id
					if (edge.source == arr[i].id)
						edgeReplacement.source = arr[0].id
					s.graph.addEdge({
						id: ID + "",
						label: edge.label,
						usedLabel: edge.usedLabel,
						source: edgeReplacement.source,
						target: edgeReplacement.target,
						type: edgeType
					})
					s.graph.dropEdge(edge.id)
				})
				arr[0].label += `, ${arr[i].label}`
				s.graph.dropNode(arr[i].id)
			}
		})
		s.refresh()
	} catch (e) {
		console.error(e)
		alert("Incomplete DFA!")
	}
}
    // تنظیمات اولیه و آماده‌سازی نمایش گراف
$(document).ready(() => {
	s.graph.addNode({
		id: "-2",
		x: -350,
		y: -100,
		size: 5,
		color: 'red'
	})
	$("#labelInput").focus()
	const dragListener = new sigma.plugins.dragNodes(s, s.renderers[0])
	$("input[name='edges']").on('click', updateEdgesType)
})