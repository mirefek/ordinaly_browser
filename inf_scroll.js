// script.js

class InfScroll {
    constructor(dom, buildEmptyRow, updateRow, space = 10) {
	this.dom = dom
	this.buildEmptyRow = buildEmptyRow
	this.updateRow = updateRow
	this.space = space
	this.numViewed = 0

	this.observer = new IntersectionObserver((entries) => {
	    for (var entry of entries) {
		if (entry.isIntersecting) {
		    this.updateNumViewed(entry.target.data.i+1)
		}
	    }
	})
	this.makeSpace()
    }
    makeSpace() {
	while (this.dom.children.length < this.numViewed + this.space)
	    this.addItem()
    }
    updateNumViewed(num) {
	while (num > this.numViewed) {
	    this.observer.unobserve(this.dom.children[this.numViewed])
	    this.numViewed += 1
	    this.makeSpace()
	}
    }
    addItem() {
	const i = this.dom.children.length
	const row = this.buildEmptyRow(i)
	if (!("data" in row)) row.data = {}
	row.data.i = i
	this.observer.observe(row)
	this.dom.appendChild(row)
	this.updateRow(row, i)
    }
    getItem(i) {
	this.updateNumViewed(i-this.space+1)
	return this.dom.children[i]
    }
    updateContent() {
	for (var i = 0; i < this.dom.children.length; i++)
	    this.updateRow(this.dom.children[i], i)
    }
    disconnect() {
	this.observer.disconnect()
    }
}

window.onload = function() {
    const itemList = document.getElementById("list")
    new InfScroll(list, (index) => {
	const item = document.createElement("p")
	item.classList.add("column-item")
	item.textContent = `Item: ${index}`
	return item
    })
}
