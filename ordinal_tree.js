function buildEmptyColumnDom(i) {
    const column = document.createElement("div")
    column.classList.add("column")
    return column
}

class OrdinalTreeNode {
    constructor(start, mid, end, tree) {
	this.start = start
	this.end = end
	this.tree = tree
	this.ordinals = [start].concat(mid)
	this.subNodes = []
	this.indexShift = 1-this.ordinals.length
	this.scroll = null
	this.footer = null
	const i = this.ordinals.length-1
	while (this.end.seq(1 + i + this.indexShift).cmp(this.ordinals[i]) <= 0)
	    this.indexShift += 1
    }
    getOrdinal(index) {
	if (!(index >= 0)) {
	    console.warn("Ordinal sequence is only indexed by positive integers, got: "+index)
	    return null
	}
	while (index >= this.ordinals.length)
	    this.ordinals.push(
		this.end.seq(this.ordinals.length + this.indexShift)
	    )
	return this.ordinals[index]
    }
    getSubnode(index) {
	while (index >= this.subNodes.length)
	    this.subNodes.push(null)

	if (this.subNodes[index] === null) {
	    const start = this.getOrdinal(index)
	    const end = this.getOrdinal(index+1)
	    if (!end.isLimit()) {
		console.warn("Cannot build a sequence for a non-limit ordinal: "+end)
		return null
	    }
	    this.subNodes[index] = new OrdinalTreeNode(start, [], end, this.tree)
	}

	return this.subNodes[index]
    }
    keepOneSubnode(keepIndex) {
	for (var i = 0; i < this.subNodes.length; i++) {
	    if (i == keepIndex) continue
	    if (this.subNodes[i] === null) continue
	    if (this.subNodes[i].start.isZero()) continue
	    this.subNodes[i] = null
	}
    }

    buildEmptyRow(i) {
	const row = document.createElement("p")
	row.classList.add("column-item")
	row.addEventListener("click", (event) => {
	    this.tree.activate(this, i)
	})
	return row
    }
    updateRow(row, i) {
	const inside = document.createElement("span")
	inside.style.whiteSpace="nowrap"
	inside.style.fontSize = "1vw"
	inside.innerHTML = this.getOrdinal(i).toHtml(this.tree.displayConfig)
	row.replaceChildren(inside)

	var size = (row.offsetWidth-50)/inside.offsetWidth
	if (size > 2) size = 2
	inside.style.fontSize = size + "vw"
    }

    locked() {
	return this.tree.mustReach !== null && this.start.isZero() && this.end.cmp(this.tree.mustReach) > 0
    }
    buildColumn() {
	if (this.scroll !== null)
	    console.warn("building again a DOM for a node that was not hidden")
	const column = buildEmptyColumnDom()
	this.columnContent = document.createElement("div")
	this.columnContent.classList.add("column-content")
	this.footer = document.createElement("div")
	this.footer.classList.add("column-footer")
	if (this.locked()) this.footer.innerHTML = "???"
	else this.footer.innerHTML = this.end.toHtml(this.tree.displayConfig)
	column.replaceChildren(this.columnContent, this.footer)
	return column
    }
    fillColumn() {
	this.scroll = new InfScroll(
	    this.columnContent,
	    (i) => { return this.buildEmptyRow(i) },
	    (row, i) => { this.updateRow(row, i) }
	)
    }
    discardColumn() {
	if (this.scroll === null) {
	    console.warn("Discarding a non-existing column")
	    return
	}
	this.scroll.disconnect()
	this.scroll = null
	this.footer = null
    }
    updateConfig() {
	this.scroll.updateContent()
	this.footer.innerHTML = this.end.toHtml(this.tree.displayConfig)
    }
    unlock() {
	if (this.locked())
	    this.footer.innerHTML = this.end.toHtml(this.tree.displayConfig)
    }
}


class OrdinalTree {
    constructor(extensionIt, goalIt) {
	this.bwStack = [] // TreeNode, index
	this.fwStack = [] // integer -- indices
	this.extensionIt = extensionIt

	const configs = [
	    "one", "omega", "omega1", "cardinals",
	    "omegaPow", "power",
	    "epsilon", "zeta", "veblen0", "gamma", "veblen1", "veblen2", "basicPsi"
	]

	this.displayConfig = {}
	this.configAllTrue = {}
	this.checkboxDom = {}
	for (var x of configs) {
	    this.checkboxDom[x] = document.getElementById("show-"+x)
	    this.checkboxDom[x].addEventListener("click", (event) => {
		this.updateConfig()
	    })
	    this.configAllTrue[x] = true
	}

	this.loadConfig()
	this.mainDom = document.getElementById("main-space")
	this.goalDom = document.getElementById("goal")

	this.goalIt = goalIt
	this.updateGoal()
	this.mustReach = this.goal

	const ord = this.extensionIt.next().value
	this.curNode = new OrdinalTreeNode(Ordinal.zero, [], ord, this)
	this.curIndex = 0

	const centerColumn = this.curNode.buildColumn()
	const leftColumn = this.buildLeftColumn()
	const rightColumn = this.buildRightColumn()
	this.mainDom.replaceChildren(leftColumn, centerColumn, rightColumn)
	this.curNode.fillColumn()
	this.fillLeftColumn()
	this.fillRightColumn()
	this.highlightSelection()
    }
    getOrdinal(index) {
	return this.curNode.getOrdinal(index)
    }
    start() {
	return this.curNode.start
    }
    end() {
	return this.curNode.end
    }
    curOrdinal() {
	return this.getOrdinal(this.curIndex)
    }
    nextOrdinal() {
	return this.getOrdinal(this.curIndex+1)
    }

    loadConfig() {
	for (const [key, dom] of Object.entries(this.checkboxDom)) {
	    this.displayConfig[key] = dom.checked
	}
    }
    updateConfig() {
	this.loadConfig()
	this.curNode.updateConfig()
	if (this.getPrevNode() !== null)
	    this.getPrevNode().updateConfig()
	if (this.getNextNode() !== null)
	    this.getNextNode().updateConfig()
    }

    getPrevNode() {
	const [prevNode, prevIndex] = this.getPrevNodeIndex()
	return prevNode
    }
    getPrevNodeIndex() {
	if (this.curNode.locked()) return [null, null]
	this.ensurePrevNode()
	return this.bwStack[this.bwStack.length-1]
    }
    ensurePrevNode() {
	if (this.bwStack.length == 0) {
	    var ord = this.extensionIt.next().value
	    while (!ord.isLimit() || ord.cmp(this.curNode.end) <= 0)
		ord = this.extensionIt.next().value
	    const prevNode = new OrdinalTreeNode(Ordinal.zero, [this.curNode.end], ord, this)
	    prevNode.subNodes.push(this.curNode)
	    this.bwStack.push([prevNode, 0])
	}
    }
    getNextNode() {
	if (this.nextOrdinal().isLimit())
	    return this.curNode.getSubnode(this.curIndex)
	else
	    return null
    }

    buildLeftColumn() {
	const node = this.getPrevNode()
	if (node === null) return buildEmptyColumnDom()
	else return node.buildColumn()
    }
    fillLeftColumn() {
	const node = this.getPrevNode()
	if (node !== null) node.fillColumn()
    }
    discardLeftColumn() {
	const node = this.getPrevNode()
	if (node !== null) node.discardColumn()
    }

    buildRightColumn() {
	const node = this.getNextNode()
	if (node === null) return buildEmptyColumnDom()
	else return node.buildColumn()
    }
    fillRightColumn() {
	const node = this.getNextNode()
	if (node !== null) node.fillColumn()
    }
    discardRightColumn() {
	const node = this.getNextNode()
	if (node !== null) node.discardColumn()
    }

    updateIndex(index) {
	if (index == this.curIndex) return
	this.fwStack = []
	this.unhighlightSelection()
	this.discardRightColumn()
	this.curIndex = index
	this.sanityCheck()
	this.checkGoal()
	this.mainDom.replaceChild(this.buildRightColumn(), this.mainDom.children[2])
	this.fillRightColumn()
	this.highlightSelection()
    }

    sanityCheck() { // checks sanity of the ordinal processing
	const o = this.curOrdinal()
	const testPow = o.omegaPow()
	const testLog = testPow.omegaLog()
	const testLog2 = Ordinal.fromMonom(o.firstM()).omegaLog()
	if (!this.curOrdinal().isNormalForm())
	    console.warn("Current ordinal not in a normal form: "+o)
	else {
	    if (!testPow.isNormalForm())
		console.warn("Omega power broke the normal form: "+o+" -> "+testPow)
	    if (!testLog2.isNormalForm())
		console.warn("Omega log broke the normal form: "+o+" -> "+testLog2)
	}
	if (testLog.cmp(o) != 0)
	    console.warn("exp / log mismatch: "+this.curOrdinal()+" -pow-> "+testPow+" -log-> "+testLog)
    }

    updateGoal() {
	const iterOutput = this.goalIt.next()
	if (iterOutput.done)
	    this.goal = null
	else
	    this.goal = iterOutput.value
	if (this.goal === null)
	    this.goalDom.innerHTML = "Congratulations, you found all the ordinals in this game!"
	else
	    this.goalDom.innerHTML = "Goal: "+this.goal.toHtml(this.configAllTrue)
    }
    checkGoal() {
	if (this.goal !== null && this.curOrdinal().cmp(this.goal) == 0)
	    this.goalReached()
    }
    goalReached() {
	this.goalIndex += 1
	this.updateGoal()
	this.updateMustReach(this.goal)
    }
    updateMustReach(mustReach) {
	if (this.mustReach === null) return
	if (mustReach !== null && this.mustReach.cmp(mustReach) >= 0) return

	// fix the footer
	for (const node of [this.curNode, this.getPrevNode()]) {
	    if (node === null) continue
	    const locked0 = (node.start.isZero() && node.end.cmp(this.mustReach) > 0)
	    const locked1 = (mustReach !== null && node.start.isZero() && node.end.cmp(mustReach) > 0)
	    if (locked0 && !locked1) node.unlock()
	}

	// update mustReach & add the left column if missing

	const missing0 = (this.getPrevNode() === null)
	this.mustReach = mustReach
	const missing1 = (this.getPrevNode() === null)

	if (missing0 && !missing1) {
	    this.mainDom.children[0].remove()
	    this.mainDom.insertBefore(this.buildLeftColumn(), this.mainDom.children[0])
	    this.fillLeftColumn()
	}
    }

    highlightSelection() {
	const row1 = this.curNode.scroll.getItem(this.curIndex)
	const row2 = this.curNode.scroll.getItem(this.curIndex+1)
	row1.classList.add("column-item-hl1")
	row2.classList.add("column-item-hl2")
	row2.scrollIntoView({"block":"nearest"})
	row1.scrollIntoView({"block":"nearest"})
	const [prevNode, prevIndex] = this.getPrevNodeIndex()
	if (prevNode !== null) {
	    const row1p = prevNode.scroll.getItem(prevIndex)
	    const row2p = prevNode.scroll.getItem(prevIndex+1)
	    row1p.classList.add("column-item-hl1-prev")
	    row2p.classList.add("column-item-hl2-prev")
	}
    }
    unhighlightSelection() {
	const row1 = this.curNode.scroll.getItem(this.curIndex)
	const row2 = this.curNode.scroll.getItem(this.curIndex+1)
	row1.classList.remove("column-item-hl1")
	row2.classList.remove("column-item-hl2")
	const [prevNode, prevIndex] = this.getPrevNodeIndex()
	if (prevNode !== null) {
	    const row1p = prevNode.scroll.getItem(prevIndex)
	    const row2p = prevNode.scroll.getItem(prevIndex+1)
	    row1p.classList.remove("column-item-hl1-prev")
	    row2p.classList.remove("column-item-hl2-prev")
	}
    }

    moveUp() {
	if (this.curIndex > 0)
	    this.updateIndex(this.curIndex - 1)
    }
    moveDown() {
	this.updateIndex(this.curIndex + 1)
    }
    moveLeft() {
	if (this.getPrevNode() === null) return

	this.discardRightColumn()
	this.unhighlightSelection()

	this.fwStack.push(this.curIndex)
	this.ensurePrevNode();
	[this.curNode, this.curIndex] = this.bwStack.pop() // this.bwStack.pop()

	this.mainDom.children[2].remove()
	this.mainDom.insertBefore(this.buildLeftColumn(), this.mainDom.children[0])
	this.fillLeftColumn()
	this.highlightSelection()
    }
    moveRight() {
	if (this.getNextNode() === null) return

	this.unhighlightSelection()
	this.discardLeftColumn()

	this.curNode.keepOneSubnode(this.curIndex)
	this.bwStack.push([this.curNode, this.curIndex])
	this.curNode = this.getNextNode()
	if (this.fwStack.length > 0)
	    this.curIndex = this.fwStack.pop()
	else
	    this.curIndex = 0
	this.checkGoal()

	this.mainDom.children[0].remove()
	this.mainDom.appendChild(this.buildRightColumn())
	this.fillRightColumn()
	this.highlightSelection()
    }
    activate(node, index) {
	if (node === this.curNode) {
	    this.updateIndex(index)
	}
	else if (node == this.getPrevNode()) {
	    this.moveLeft()
	    this.updateIndex(index)
	}
	else if (node == this.getNextNode()) {
	    this.moveRight()
	    this.updateIndex(index)
	}
	else {
	    console.warn("Couldn't find appropriate node to the clicked row")
	    console.log("index = "+index)
	    console.log(node)
	}
    }
}

function* extensions() {
    const zero = Ordinal.zero
    const one = Ordinal.one
    const two = Ordinal.two
    const fromInt = Ordinal.fromInt
    const omega = Ordinal.omega
    const omega1 = Ordinal.omega1
    const psi = Ordinal.psi
    const psi0 = Ordinal.psi0
    const psi1 = Ordinal.psi1
    const epsilon0 = Ordinal.epsilon0
    const zeta0 = Ordinal.zeta0
    const gamma0 = Ordinal.gamma0
    const veblen = Ordinal.veblen
    const veblenCol = Ordinal.veblenCollapse
    const aleph = Ordinal.aleph

    yield omega
    yield omega.mulN(2)
    yield omega.powN(2)
    yield omega.omegaPow()
    yield omega.mulN(2).omegaPow()
    yield omega.omegaPow().omegaPow()
    yield epsilon0
    yield one.epsilon()
    yield omega.epsilon()
    yield epsilon0.epsilon()
    yield zeta0
    yield veblen(fromInt(3), zero)
    yield veblen(omega, zero)
    yield veblen(epsilon0, zero)
    yield veblen(veblen(two, zero), zero)
    yield gamma0
    yield one.gamma()
    yield omega.gamma()
    yield epsilon0.gamma()
    yield gamma0.gamma()
    yield veblen(one, one, zero)
    yield veblen(omega, one, zero)
    yield veblen(one, zero, zero, zero)
    yield veblenCol(zero, omega1.pow(omega), zero)
    yield veblenCol(zero, omega1.pow(epsilon0), zero)
    yield veblenCol(zero, omega1.pow(gamma0), zero)
    yield psi0(omega1.pow(omega1.pow(omega1)))
    yield psi0(aleph(two))
    yield psi0(aleph(two).add(omega1.pow(omega1.succ())))
    yield psi0(aleph(two).add(omega1.pow(omega1.pow(omega))))
    yield psi0(aleph(two).add(omega1.pow(omega1.pow(omega1))))
    yield psi0(aleph(two).mulN(2))
    yield psi0(aleph(omega))
    yield psi0(aleph(psi0(omega1.pow(omega1))))
    yield psi0(aleph(omega1))
    var x = aleph(omega)
    while (true) {
	yield Ordinal.psiRaw(Ordinal.zero, x)
	x = aleph(x)
    }
}

function* goals() {
    const zero = Ordinal.zero
    const one = Ordinal.one
    const two = Ordinal.two
    const fromInt = Ordinal.fromInt
    const omega = Ordinal.omega
    const omega1 = Ordinal.omega1
    const psi = Ordinal.psi
    const psi0 = Ordinal.psi0
    const psi1 = Ordinal.psi1
    const epsilon0 = Ordinal.epsilon0
    const zeta0 = Ordinal.zeta0
    const gamma0 = Ordinal.gamma0
    const veblen = Ordinal.veblen
    const veblenCol = Ordinal.veblenCollapse
    const aleph = Ordinal.aleph

    yield fromInt(42)
    yield omega.addN(5)
    yield fromInt(10)
    yield omega.mulN(5).addN(6)
    yield omega.mulN(3).addN(9)
    yield omega.powN(2).add(omega.addN(1))
    yield omega.powN(6).mulN(3).add(omega.powN(4).mulN(15).addN(3))
    yield omega.powN(10)
	.add(omega.powN(9)).add(omega.powN(8)).add(omega.powN(7))
	.add(omega.powN(5)).add(omega.powN(4)).add(omega.powN(3))
	.add(omega.powN(2)).add(omega).succ()
    yield psi0(psi0(one).addN(5)).add(psi0(psi0(one)).mulN(10))
    yield psi0(psi0(one).addN(3)).mulN(3).add(psi0(psi0(one).addN(2)).mulN(2)).add(psi0(fromInt(4)).mulN(4))
    yield psi0(psi0(fromInt(4)).add(psi0(fromInt(3))).add(psi0(two)).add(psi0(one)))
    yield psi0(psi0(fromInt(4)).mulN(4).add(psi0(two).mulN(2))).add(psi0(psi0(fromInt(3)).mulN(10).add(psi0(one).mulN(3)))).add(psi0(fromInt(15)))
    yield psi0(psi0(psi0(psi0(one).mulN(2)).mulN(2)).mulN(2)).mulN(2)
    yield psi0(psi0(psi0(one).succ())).add(psi0(psi0(psi0(one)).succ())).add(psi0(psi0(psi0(one))))
    yield psi0(psi0(psi0(psi0(psi0(one)))).add(psi0(psi0(psi0(one)))).add(psi0(psi0(one))).add(psi0(one))).add(psi0(psi0(psi0(psi0(psi0(one))))))
    yield psi0(omega1.add(psi0(omega1)))
    yield psi0(omega1.add(psi0(omega1).mulN(2)).addN(3))
    yield psi0(omega1.add(psi0(omega1.addN(3))))
    yield psi0(omega1.add(psi0(omega1.add(psi0(omega1).mulN(2)).succ())).add(psi0(omega1.add(psi0(omega1)).addN(2))).add(psi0(omega1.add(psi0(psi0(one))))))
    yield psi0(omega1.mulN(4).add(psi0(omega1.mulN(4).add(psi0(omega1.mulN(3).add(psi0(omega1.mulN(2).add(psi0(omega1)))))))))
    yield psi0(omega1.mulN(6)).add(psi0(omega1.mulN(3).add(psi0(omega1.mulN(3).add(psi0(omega1.mulN(3).add(psi0(omega1)))))).add(psi0(omega1.mulN(3).add(psi0(psi0(psi0(one))))))))
    yield psi0(psi(one, psi0(one)).add(psi0(psi(one, psi0(one)).add(psi0(psi(one, psi0(one)).add(psi0(psi(one, psi0(one)))))))))
    yield psi0(psi(one, psi0(psi(one, psi0(psi(one, psi0(psi0(one))))))).add(psi0(psi(one, psi0(psi(one, psi0(psi(one, psi0(one)))))))).add(psi0(psi(one, psi0(psi(one, psi0(psi0(psi0(one))))))))).add(psi0(psi(one, psi0(psi0(psi0(one))))))
    yield psi0(psi(one, omega1).mulN(11))
    yield psi0(psi(one, omega1.add(psi0(omega1.mulN(2)))).add(psi0(psi(one, omega1.add(psi0(omega1.mulN(2)))).add(psi0(omega1.mulN(6))))))
    yield psi0(psi(one, omega1).mulN(6).add(omega1))
    yield psi0(psi(one, omega1.mulN(4)).add(psi(one, omega1.mulN(3))).add(psi(one, omega1.mulN(2))))
}

var tree = null
window.onload = function() {
    
    tree = new OrdinalTree(extensions(), goals())
    window.addEventListener("keydown", (event) => {
	// console.log(event)
	if (event.key == "ArrowUp") {
	    tree.moveUp()
	    event.preventDefault()
	}
	if (event.key == "ArrowDown") {
	    tree.moveDown()
	    event.preventDefault()
	}
	if (event.key == "ArrowLeft") {
	    tree.moveLeft()
	    event.preventDefault()
	}
	if (event.key == "ArrowRight") {
	    tree.moveRight()
	    event.preventDefault()
	}
	if (event.key == "s") {
	    if (tree.goal !== null) {
		console.log("Skipping a goal")
		tree.goalReached()
	    }
	}
	if (event.key == "p") {
	    console.log(tree.curOrdinal().toCode())
	}
    })
}
