


// Default variables

var state = 0;
// 0 = No actions
// 1 = Editing node text
// 2 = Dragging node
// 3 = Drawing connection
// 4 = Deleting connections

var onEmpty = 1;
// 0 = Mouse is hovering on empty canvas
// 1 = Mouse is hovering over element

var mX = 0; // Mouse x position
var mX = 0; // Mouse y position
var clickedX = 0; // X position of last click
var clickedY = 0; // Y position of last click
var mouseMoved = 0; // State of mouse movement between click and release

var nodes = [];
var connections = [];

var nodeCount = 0;
var connectionCount = 0;

var clicked;
var connecting;

var xOffset = 0;
var yOffset = 0;
var draggedConnections = [];



// Add default mouse interactions to body

d3.select('body')
  .on('mousedown', bodyMouseDown)
  .on('mouseup', bodyMouseup)
  .on('mousemove', bodyMouseMove)
  .on('dblclick', bodyDBClick)
  .on('contextmenu', bodyRClick);



// Functions

function bodyMouseDown() {

  if (state < 2) {

    // Update last clicked position

    clickedX = mX;
    clickedY = mY;
  }


  // Set mouse movement tracking variable to default

  mouseMoved = 0;


  // Reset state
  // Un-focus all nodes *****

  if (state < 2) { state = 0; }
}



function bodyMouseup() {

  if (state == 2) {

    // Release dragged nodes

    let nodeConnections = nodes[getIndexFromID(clicked.attr('id'))][2];
    for (i = 0; i < nodeConnections.length; i++) {
      let c = connections[getIndexFromID(nodeConnections[i])];
      let num = ((c[2] == clickedX) && (c[3] == clickedY)) * 2;
      c[0 + num] = getElementCenterX(clicked);
      c[1 + num] = getElementCenterY(clicked);
    }

    draggedConnections.length = 0;
    state = 0;
  }


  if (state == 3) {

    // Delete in-progress connections

    if (onEmpty) {

      connecting.remove();
      state = 0;
    }
  }


  if (state == 4) {

    // Delete "cut" connections *****
  }
}



function bodyMouseMove() {

  // Reset onEmpty to default (will be turned false on element hover)

  onEmpty = 1;


  // Set mouse movement tracking variable to true (moved)

  mouseMoved = 1;


  // Update mouse x, y positions

  mX = event.clientX;
  mY = event.clientY;


  if (state == 2) {

    // Update dragged node position

    let x = getElementCenterX(clicked);
    let y = getElementCenterY(clicked);

    clicked.style('margin-left', (mX + xOffset) + 'px')
    .style('margin-top', (mY + yOffset) + 'px');

    if (draggedConnections.length > 0) {
      for (let i = 0; i < draggedConnections.length; i++) {

        resizeElement(draggedConnections[i][0], draggedConnections[i][1], draggedConnections[i][2], x, y);
      }
    }
  }

  if (state == 3) {

    // Update drawn connection position/size

    resizeElement(connecting, clickedX, clickedY, mX, mY);
  }

  if (state == 4) {

    // Check for connection line cuts *****
  }

}



function bodyDBClick() {

  if (onEmpty) {

    if (state == 0) {

      // Create new node at mouse position

      createNode(clickedX, clickedY, -1);
  }
}



function bodyRClick() {

  // Prevent contextmenu from showing

  event.preventDefault();
}



function nodeHover() {

  // Set onEmpty to false to disable stacking new nodes
  // Display node handle *****

  onEmpty = 0;
}



function nodeHoverOut() {

  // Hide node handle *****
}



function nodeHandleMouseDown() {

  // Set state to 2 (dragging node)
  // Save node parent to "clicked"
  // Save x, y offsets between mouse and element position
  // Add child connections to an array

  if (state < 2) {
    state = 2;
    clicked = d3.select(this.parentNode);
    clickedX = getElementCenterX(clicked);
    clickedY = getElementCenterY(clicked);

    xOffset = (parseInt(clicked.style('margin-left'), 10) - mX);
    yOffset = (parseInt(clicked.style('margin-top'), 10) - mY);

    let nodeConnections = nodes[getIndexFromID(clicked.attr('id'))][2];
    for (i = 0; i < nodeConnections.length; i++) {
      let c = connections[getIndexFromID(nodeConnections[i])];
      let num = ((c[0] == clickedX) && (c[1] == clickedY)) * 2;
      draggedConnections.push([d3.select('#' + nodeConnections[i]), c[0 + num], c[1 + num]]);
    }
  }
}



function nodeHandleMouseUp() {

  // If dragging a node, release it *****
}



function nodeChildMouseDown() {

  // Set onEmpty to false to disable stacking new nodes

  onEmpty = 0;


  // If possible...
  // Save node parent to "clicked"
  // If left clicked, set state to 1 (editing)
  // If right clicked, create connection and set state to 3 (drawing connection)

  if (state < 2) {

    // Save object into "clicked"

    clicked = d3.select(this.parentNode);


    if (event.button == 0) {

      state = 1;

    } else if (event.button == 2) {

      // Update last clicked position

      clickedX = getElementCenterX(clicked);
      clickedY = getElementCenterY(clicked);


      // Prevent default context menu from showing
      // Create new connection
      // Set state to 3 (drawing connection)

      event.preventDefault();
      createConnection(-1);
      state = 3;
    }
  }
}



function nodeChildMouseUp() {

  if (state == 3) {

    // If drawing connection, check if this was the starting point
    // If so delete connection...
    // If not snap connection to this node's center
    // Save connection info to the connections array
    // Add connection id to parents' info arrays
    // Increment total number of connections by one

    let releasedOn = d3.select(this.parentNode);

    if (releasedOn != clicked) {

      let x2 = getElementCenterX(releasedOn);
      let y2 = getElementCenterY(releasedOn);

      let thisId = connecting.attr('id');
      let clickedId = clicked.attr('id');
      let releasedOnId = releasedOn.attr('id');

      resizeElement(connecting, clickedX, clickedY, x2, y2);
      connections.push([clickedX, clickedY, x2, y2]);
      nodes[getIndexFromID(clickedId)][2].push(thisId);
      nodes[getIndexFromID(releasedOnId)][2].push(thisId);
      connectionCount++;

    } else {

      connecting.remove();
    }

    draggedConnections.length = 0;
    state = 0;
  }
}





function createNode(x, y, id) {

  // Check if old or new id should be used and define it
  // If new, increment total number of nodes by one
  // Create id string
  // Push new node object to the "nodes array"

  state = 1;
  let id2 = nodeCount;
  if (id != -1) { id2 = id; } else { nodeCount++; }
  let id3 = 'node-' + id2;
  nodes.push([x, y, []]);


  // Create new node with given parameters
  // Save the node's text containing child in "clicked"

  d3.select('body')
    .append('div')
    .classed('text_bubble_wrap', true)
    .attr('id', id3)
    .style('margin-left', (x - 14) + 'px')
    .style('margin-top', (y - 32) + 'px')
    .style('z-index', '10')
    .on('mouseenter', nodeHover)
    .on('mouseleave', nodeHoverOut)
    .call(function(parent) {

      parent.append('div')
        .classed('text_bubble_handle', true)
        .on('mousedown', nodeHandleMouseDown)
        .on('mouseup', nodeHandleMouseUp)
        .append('div')
        .classed('handle_line_and_circle', true)
        .call(function(parent) {

          parent.append('div')
            .classed('handle_circle', true);

          parent.append('div')
            .classed('handle_line', true);
        });

      parent.append('div')
        .style('display', 'inline-block')
        .on('mousedown', nodeChildMouseDown)
        .on('mouseup', nodeChildMouseUp)
        .call(function(parent) { clicked = parent.parentNode; })
        .append('p')
        .classed('text_bubble', true)
        .attr('contenteditable', 'true')
        .node().focus();
    });
}



function createConnection(id) {

  // Check if old or new id should be used and define it
  // Create id string
  // Create connection box

  let id2 = connectionCount;
  if (id != -1) { id2 = id; }
  let id3 = 'connection-' + id2;

  d3.select('body')
    .append('div')
    .attr('id', id3)
    .style('border', '1px solid #000')
    .style('position', 'absolute')
    .style('z-index', '0')
    .call(function(parent) {
      connecting = parent;
    });
}



function resizeElement(obj, x, y, x2, y2) {

  // Reposition and resize element

  obj.style('margin-left', Math.min(x, x2) + 'px')
  .style('margin-top', Math.min(y, y2) + 'px')
  .style('width', Math.abs(x - x2) + 'px')
  .style('height', Math.abs(y - y2) + 'px');
}



function getElementCenterX(obj) {

  // Calculate and return centered X position of element

  return parseInt(obj.style('margin-left'), 10) + Math.floor(parseInt(obj.style('width'), 10) / 2);
}



function getElementCenterY(obj) {

  // Calculate and return centered Y position of element

  return parseInt(obj.style('margin-top'), 10) + Math.floor(parseInt(obj.style('height'), 10) / 2);
}

function getIndexFromID(id) {

  // Extract array index from element id

  return id.split('-')[1];
}
