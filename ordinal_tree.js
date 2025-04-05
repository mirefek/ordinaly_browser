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

    buildColumn() {
	if (this.scroll !== null)
	    console.warn("building again a DOM for a node that was not hidden")
	const column = buildEmptyColumnDom()
	this.columnContent = document.createElement("div")
	this.columnContent.classList.add("column-content")
	this.footer = document.createElement("div")
	this.footer.classList.add("column-footer")
	this.footer.innerHTML = this.end.toHtml(this.tree.displayConfig)
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
}


class OrdinalTree {
    constructor(iterator) {
	this.bwStack = [] // TreeNode, index
	this.fwStack = [] // integer -- indices
	this.iterator = iterator

	const configs = [
	    "one", "omega", "omega1", "cardinals",
	    "omegaPow", "power",
	    "epsilon", "zeta", "veblen0", "gamma", "veblen1", "veblen2", "basicPsi"
	]

	this.displayConfig = {}
	this.checkboxDom = {}
	for (var x of configs) {
	    this.checkboxDom[x] = document.getElementById("show-"+x)
	    this.checkboxDom[x].addEventListener("click", (event) => {
		this.updateConfig()
	    })
	}

	this.loadConfig()

	const ord = this.iterator.next().value
	this.curNode = new OrdinalTreeNode(Ordinal.zero, [], ord, this)
	this.curIndex = 0

	this.mainDom = document.getElementById("main-space")
	const centerColumn = this.curNode.buildColumn()
	const leftColumn = this.getPrevNode().buildColumn()
	const rightColumn = buildEmptyColumnDom()
	this.mainDom.replaceChildren(leftColumn, centerColumn, rightColumn)
	this.curNode.fillColumn()
	this.getPrevNode().fillColumn()
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
	this.getPrevNode().updateConfig()
	if (this.getNextNode() !== null)
	    this.getNextNode().updateConfig()
    }

    getPrevNode() {
	const [prevNode, prevIndex] = this.getPrevNodeIndex()
	return prevNode
    }
    getPrevNodeIndex() {
	this.ensurePrevNode()
	return this.bwStack[this.bwStack.length-1]
    }
    ensurePrevNode() {
	if (this.bwStack.length == 0) {
	    var ord = this.iterator.next().value
	    while (!ord.isLimit() || ord.cmp(this.curNode.end) <= 0)
		ord = this.iterator.next().value
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

    buildRightColumn() {
	if (!this.nextOrdinal().isLimit()) return buildEmptyColumnDom()
	else return this.getNextNode().buildColumn()
    }
    fillRightColumn() {
	if (this.nextOrdinal().isLimit())
	    this.getNextNode().fillColumn()
    }
    discardRightColumn() {
	if (this.nextOrdinal().isLimit())
	    this.getNextNode().discardColumn()
    }
    updateIndex(index) {
	if (index == this.curIndex) return
	this.fwStack = []
	this.unhighlightSelection()
	this.discardRightColumn()
	this.curIndex = index
	this.sanityCheck()
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

    highlightSelection() {
	const row1 = this.curNode.scroll.getItem(this.curIndex)
	const row2 = this.curNode.scroll.getItem(this.curIndex+1)
	const [prevNode, prevIndex] = this.getPrevNodeIndex()
	const row1p = prevNode.scroll.getItem(prevIndex)
	const row2p = prevNode.scroll.getItem(prevIndex+1)
	row1.classList.add("column-item-hl1")
	row2.classList.add("column-item-hl2")
	row1p.classList.add("column-item-hl1-prev")
	row2p.classList.add("column-item-hl2-prev")
	row2.scrollIntoView({"block":"nearest"})
	row1.scrollIntoView({"block":"nearest"})
    }
    unhighlightSelection() {
	const row1 = this.curNode.scroll.getItem(this.curIndex)
	const row2 = this.curNode.scroll.getItem(this.curIndex+1)
	const [prevNode, prevIndex] = this.getPrevNodeIndex()
	const row1p = prevNode.scroll.getItem(prevIndex)
	const row2p = prevNode.scroll.getItem(prevIndex+1)
	row1.classList.remove("column-item-hl1")
	row2.classList.remove("column-item-hl2")
	row1p.classList.remove("column-item-hl1-prev")
	row2p.classList.remove("column-item-hl2-prev")
    }

    moveUp() {
	if (this.curIndex > 0)
	    this.updateIndex(this.curIndex - 1)
    }
    moveDown() {
	this.updateIndex(this.curIndex + 1)
    }
    moveLeft() {
	this.discardRightColumn()
	this.unhighlightSelection()

	this.fwStack.push(this.curIndex)
	this.ensurePrevNode();
	[this.curNode, this.curIndex] = this.bwStack.pop() // this.bwStack.pop()

	this.mainDom.children[2].remove()
	this.mainDom.insertBefore(this.getPrevNode().buildColumn(), this.mainDom.children[0])
	this.getPrevNode().fillColumn()
	this.highlightSelection()
    }
    moveRight() {
	if (!this.nextOrdinal().isLimit()) return

	this.unhighlightSelection()
	this.getPrevNode().discardColumn()


	this.curNode.keepOneSubnode(this.curIndex)
	this.bwStack.push([this.curNode, this.curIndex])
	this.curNode = this.getNextNode()
	if (this.fwStack.length > 0)
	    this.curIndex = this.fwStack.pop()
	else
	    this.curIndex = 0

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

var tree = null
window.onload = function() {

    function* genOrdinals() {
	yield Ordinal.omega
	yield Ordinal.omega.mulN(2)
	yield Ordinal.omega.powN(2)
	yield Ordinal.omega.omegaPow()
	yield Ordinal.omega.mulN(2).omegaPow()
	yield Ordinal.omega.omegaPow().omegaPow()
	yield Ordinal.epsilon0
	yield Ordinal.one.epsilon()
	yield Ordinal.omega.epsilon()
	yield Ordinal.epsilon0.epsilon()
	yield Ordinal.veblen(Ordinal.two, Ordinal.zero)
	yield Ordinal.veblen(Ordinal.fromInt(3), Ordinal.zero)
	yield Ordinal.veblen(Ordinal.omega, Ordinal.zero)
	yield Ordinal.veblen(Ordinal.epsilon0, Ordinal.zero)
	yield Ordinal.veblen(Ordinal.veblen(Ordinal.two, Ordinal.zero), Ordinal.zero)
	yield Ordinal.gamma0
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1).mulN(2))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1).mul(Ordinal.omega))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1).mul(Ordinal.epsilon0))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1).mul( Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1)) ))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1.succ()))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1.mul(Ordinal.omega)))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1.powN(2)))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1.pow(Ordinal.omega)))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1.pow(Ordinal.epsilon0)))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1.pow(Ordinal.gamma0)))
	yield Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1.pow(Ordinal.omega1)))
	yield Ordinal.psi0(Ordinal.aleph(Ordinal.two))
	yield Ordinal.psi0(
	    Ordinal.aleph(Ordinal.two).add(
		Ordinal.omega1.pow(Ordinal.omega1.succ())))
	yield Ordinal.psi0(
	    Ordinal.aleph(Ordinal.two).add(
		Ordinal.omega1.pow(Ordinal.omega1.pow(Ordinal.omega))))
	yield Ordinal.psi0(
	    Ordinal.aleph(Ordinal.two).add(
		Ordinal.omega1.pow(Ordinal.omega1.pow(Ordinal.omega1))))
	yield Ordinal.psi0(Ordinal.aleph(Ordinal.two).mulN(2))
	yield Ordinal.psi0(Ordinal.aleph(Ordinal.omega))
	yield Ordinal.psi0(Ordinal.aleph(Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1))))
	yield Ordinal.psi0(Ordinal.aleph(Ordinal.omega1))
	var x = Ordinal.aleph(Ordinal.omega)
	while (true) {
	    yield Ordinal.psiRaw(Ordinal.zero, x)
	    x = Ordinal.aleph(x)
	}
    }
    
    tree = new OrdinalTree(genOrdinals())
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
    })
}
