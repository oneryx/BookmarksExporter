/**
 * Export bookmark bar links as JSON/CSV (parent folder titles as tags).
 * Following "Object" being used.
 * 
 * ChainNode (used to get parent folders)
 *  - id: string
 *  - title: string
 *  - parent: ChainNode
 * 
 * Link (represent each bookmark item)
 *  - title: string
 *  - url: string
 *  - tags: []string
 * 
 */

// node id, node title
let idTitleDict = {}
// chilld id, parent id
let childParentDict = {}
// result array, []Link
let linkArray = []
// json or csv
let fileType = ""

// Check whether it's a valid node created by user, either a folder or a link
function isUserAddedNode(nodeId) {
    // id "0" and "1" are used by browser default nodes
    return nodeId && nodeId !== "0" & nodeId !== "1"
}

// Get ParentChainNode from bookmarks.BookmarkTreeNode id
function getParentChain(nodeId) {
    let chainNode = {}
    chainNode.id = nodeId
    chainNode.title = idTitleDict[nodeId]
    let parentId = childParentDict[nodeId]
    if (isUserAddedNode(parentId)) {
        chainNode.parent = getParentChain(parentId)
    }
    return chainNode
}

// Go though ChainNode structure and turn parents' titles as tags (array of string)
function parentsAsTags(chainNode) {
    let tags = []
    if (isUserAddedNode(chainNode.id)) {
        tags.unshift(chainNode.title)
    }
    let tempNode = chainNode
    while (tempNode.parent) {
        tempNode = tempNode.parent
        tags.unshift(tempNode.title);
    }
    return tags
}

// Walk through bookmarks.BookmarkTreeNode and its children recursively,
// and push items into linkArray
function walk(node) {
    // collect infomation in dicts, for future usage
    idTitleDict[node.id] = node.title
    childParentDict[node.id] = node.parentId
    // link node
    if (node.url) {
        let link = {}
        link.title = node.title
        link.url = node.url
        link.tags = parentsAsTags(getParentChain(node.parentId))
        linkArray.push(link)
    }
    // folder node, walk through children
    if (node.children) {
        node.children.forEach(n => { walk(n) })
    }
}

// Convert links to JSON
// The JSON.stringify() on array will print everything in one line.
// Customize it to print each link in one line.
function linksToJSON() {
    let str = "[\n"
    linkArray.forEach((i, idx, array) => {
        str += "  " + JSON.stringify(i)
        if (idx !== array.length - 1)  str += ","
        str += "\n"
    });
    str += "]"
    return str
}

// Convert links to CSV
function linksToCSV() {
    let str = "Title,URL,Tags\n"
    linkArray.forEach(i => { str += "\"" + i.title + "\",\"" + i.url + "\",\"" + i.tags.join(",") + "\"\n" })
    return str
}


// Download result as file
function downloadAsFile() {
    let txt = document.getElementById("ta").value
    window.blob = new Blob([txt], { type: "application/octet-binary" })
    window.url = URL.createObjectURL(blob)

    chrome.downloads.download({
        url: window.url,
        filename: "Bookmarks." + fileType,
        saveAs: false
    }, (id) => URL.revokeObjectURL(window.url));
}

// Set file tyope, and nable Download button
function converted(_fileType) {
    fileType = _fileType
    document.getElementById("btnDownload").disabled = false
}

// Entry point, execute after DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        // only walk through bookmark bar node
        walk(bookmarkTreeNodes[0].children[0])
    });

    document.getElementById("btnJSON").addEventListener("click", () => {
        document.getElementById("ta").value = linksToJSON()
        converted("json")
    })

    document.getElementById("btnCSV").addEventListener("click", () => {
        document.getElementById("ta").value = linksToCSV()
        converted("csv")
    })

    document.getElementById("btnDownload").addEventListener("click", () => downloadAsFile())
});
