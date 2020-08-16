




// Default variables

var state = 0;
// 0 = No actions
// 1 = Editing node text
// 2 = Dragging node
// 3 = Drawing connection
// 4 = Deleting connections
// 5 = Selecting nodes

var onEmpty = 1;
// 0 = Mouse is hovering on empty canvas
// 1 = Mouse is hovering over element

var mX = 0; // Mouse x position
var mY = 0; // Mouse y position
var clickedX = 0; // X position of last click
var clickedY = 0; // Y position of last click
var mouseMoved = 0; // State of mouse movement between click and release
var activeKey = 0;

var nodes = [];
var connections = [];

var nodeCount = 0;
var connectionCount = 0;

var clicked;
var connecting;
var sketchId;

var selectedNodes = [];
var selectedConnections = [];

var xOffset = 0;
var yOffset = 0;





// Add default interactions to body

document.addEventListener('keydown', getKey);
document.addEventListener('keyup', function() { activeKey = 0; });

d3.select('body')
  .on('mousedown', bodyMouseDown)
  .on('mouseup', bodyMouseup)
  .on('mousemove', bodyMouseMove)
  .on('dblclick', bodyDBClick)
  .on('contextmenu', bodyRClick);

d3.select('a.button')
  .on('mousedown', function() { onEmpty = 0; })
  .on('click', deleteSelection);





// Input Functions

function bodyMouseDown() {

  // Set mouse movement tracking variable to default

  mouseMoved = 0;


  if (state < 2) {

    // Un-focus all nodes *****
    // Update last clicked position
    // Clear selection arrays
    // Delete latest node if empty
    // Reset state
    // If right clicked, set state to 4 (connection cutting tool)

    clickedX = mX;
    clickedY = mY;


    if (onEmpty) {


      // Delete new node if empty

      if (state == 1) {

        if (clicked.select('p').text() == "") {

          // Delete latest node

          clicked.remove();
        }
      } else {

        // Prevent contextmenu from showing

        event.preventDefault();
      }


      // Cancel all active selections

      deselectAll();


      state = 0;

      if (getM() == 2) {

        // Create connection box
        // Set state to 4 (cutting connections)

        createConnection('cuttingTool', mX, mY, mX, mY);
        state = 4;

      } else if (getM() == 3) {

        // Create connection box
        // Set state to 5 (selecting nodes)

        createConnection('multiSelect', mX, mY, mX, mY);
        connecting.style('background-color', 'rgba(255, 255, 255, 0.03)');
        state = 5;
      }
    }
  }
}



function bodyMouseup() {

  if (state == 2) {

    // Release dragged nodes

    let x = getElementCenterX(clicked);
    let y = getElementCenterY(clicked);

    let nodeConnections = nodes[getIndexFromID(clicked.attr('id'))][2];
    for (i = 0; i < nodeConnections.length; i++) {
      let c = connections[getIndexFromID(nodeConnections[i])];
      let num = ((c[2] == clickedX) && (c[3] == clickedY)) * 2;
      c[0 + num] = x;
      c[1 + num] = y;
    }

    nodes[getIndexFromID(clicked.attr('id'))][0] = x;
    nodes[getIndexFromID(clicked.attr('id'))][1] = y;
    selectedConnections.length = 0;
    state = 1;
  }


  if (state == 3) {

    // Delete in-progress connections

    if (onEmpty) {

      connecting.remove();
      state = 0;
    }
  }


  if (state == 4) {

    // Delete "cut" connections
    // Delete cutting tool sketch
    // Reset state to default

    for (let i = 0; i < connections.length; i++) {

      let a = connections[i];

      a[5] = Math.floor(intersects(a[0], a[1], a[2], a[3], clickedX, clickedY, mX, mY));
      if (a[5]) { d3.select('#connection-' + i).remove(); }
    }
    connecting.remove();
    state = 0;
  }


  if (state == 5) {

    // Add nodes in selection box to selectedNodes
    // Add attached connections to selectedConnections
    // Close selection tool

    for (let i = 0; i < nodes.length; i++) {

      let a = nodes[i];

      if (isInBox(a[0], a[1], clickedX, clickedY, mX, mY)) {

        aa = a[2];

        for (let y = 0; y < aa.length; y++) {

          selectedConnections.push(d3.select('#' + aa[y]));
        }

        selectedNodes.push(d3.select('#node-' + i));
      }
    }

    connecting.remove();
    state = 0;
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


  // Prevent text selection when not editing nodes

  if (state != 1) { event.preventDefault(); }


  if (state == 2) {

    // Update dragged node position
    // Update attached connections' size/position

    let x = getElementCenterX(clicked);
    let y = getElementCenterY(clicked);

    clicked.style('margin-left', (mX + xOffset) + 'px')
      .style('margin-top', (mY + yOffset) + 'px');

    if (selectedConnections.length > 0) {
      for (let i = 0; i < selectedConnections.length; i++) {

        let obj = selectedConnections[i];
        let x2 = obj[1];
        let y2 = obj[2];
        let dir = (((x < x2) && (y < y2)) || ((x > x2) && (y > y2)));

        resizeElement(obj[0], x, y, x2, y2);
        drawLine(obj[3], x, y, x2, y2, 0, 0);
      }
    }
  }


  if (state == 3) {

    // Update drawn connection position/size

    let dir = (((clickedX < mX) && (clickedY < mY)) || ((clickedX > mX) && (clickedY > mY)));

    resizeElement(connecting, clickedX, clickedY, mX, mY);
    drawLine(sketchId, clickedX, clickedY, mX, mY, 0, 0);
  }


  if (state == 4) {

    // Draw cutting line
    // Check for connections line cuts
    // Highlight connections selected for cutting

    resizeElement(connecting, clickedX, clickedY, mX, mY);
    drawLine(sketchId, clickedX, clickedY, mX, mY, 1, 0);

    for (let i = 0; i < connections.length; i++) {

      let a = connections[i];

      a[5] = Math.floor(intersects(a[0], a[1], a[2], a[3], clickedX, clickedY, mX, mY));
      drawLine(a[4], a[0], a[1], a[2], a[3], 0, a[5]);
    }
  }


  if (state == 5) {

    // Draw selection box
    // Check for overlap with nodes
    // Highlight selected nodes

    resizeElement(connecting, clickedX, clickedY, mX, mY);

    for (let i = 0; i < nodes.length; i++) {

      let a = nodes[i];
      let c = '';

      if (isInBox(a[0], a[1], clickedX, clickedY, mX, mY)) {

        c = '3F4047';

      } else { c = '2F3138'; }

      d3.select('#node-' + i).select('p').style('background-color', '#' + c);
    }
  }

}



function bodyDBClick() {

  // Prevent contextmenu from showing

  event.preventDefault();


  if (onEmpty) {

    if (!mouseMoved) {

      if (state == 0) {

        // Create new node at mouse position

        createNode(-1, clickedX, clickedY);
      }
    }
  }
}



function bodyRClick() {

  // Prevent contextmenu from showing

  event.preventDefault();
}



function nodeHover() {

  // Set onEmpty to false to disable stacking new nodes
  // Display node handle

  onEmpty = 0;

  d3.select(this)
     .select('div.text_bubble_handle')
     .style('opacity', '100%');

  if (state == 3) {

    // Scale up selected node

    d3.select(this)
      .style('transform', 'scale(1.02)');
  }
}



function nodeHoverOut() {

  // Hide node handle

  d3.select(this)
     .select('div.text_bubble_handle')
     .style('opacity', '0%');

  if (state == 3) {

   // Reset scale

   d3.select(this)
     .style('transform', 'scale(1)');
  }
}



function nodeHandleMouseDown() {

  event.preventDefault();

  // Set onEmpty to false to disable stacking new nodes

  onEmpty = 0;


  // Set state to 2 (dragging node)
  // Save node parent to "clicked"
  // Save x, y offsets between mouse and element position
  // Add child connections to an array

  if (state < 2) {

    if (getM() == 0) {

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
        selectedConnections.push([d3.select('#' + nodeConnections[i]), c[0 + num], c[1 + num], c[4]]);
      }
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

    if (getM() == 0) {

      state = 1;

    } else if (getM() == 2) {

      // Update last clicked position

      clickedX = getElementCenterX(clicked);
      clickedY = getElementCenterY(clicked);


      // Prevent default context menu from showing
      // Create new connection
      // Set state to 3 (drawing connection)

      event.preventDefault();
      createConnection(-1, clickedX, clickedY, mX, mY);
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

    if (releasedOn.attr('id') != clicked.attr('id')) {

      let x2 = getElementCenterX(releasedOn);
      let y2 = getElementCenterY(releasedOn);

      let thisId = connecting.attr('id');
      let clickedId = clicked.attr('id');
      let releasedOnId = releasedOn.attr('id');

      resizeElement(connecting, clickedX, clickedY, x2, y2);
      drawLine(sketchId, clickedX, clickedY, x2, y2, 0, 0);
      connections.push([clickedX, clickedY, x2, y2, sketchId]);
      nodes[getIndexFromID(clickedId)][2].push(thisId);
      nodes[getIndexFromID(releasedOnId)][2].push(thisId);
      connectionCount++;

    } else {

      connecting.remove();
    }


    releasedOn.style('transform', 'scale(1)');
    selectedConnections.length = 0;
    state = 0;
  }
}



function nodeInput() {

  // Update attached connections when typing

  let node = nodes[getIndexFromID(clicked.attr('id'))];
  let x = getElementCenterX(clicked); // New position
  let y = getElementCenterY(clicked);
  let x3 = node[0];  // Old position
  let y3 = node[1];
  let nodeConnections = node[2];

  for (i = 0; i < nodeConnections.length; i++) {

    let c = connections[getIndexFromID(nodeConnections[i])];
    let num = ((c[2] == x3) && (c[3] == y3)) * 2;

    let x2 = c[2 - num]; // Moved connection ednpoint position
    let y2 = c[3 - num];
    let dir = (((x < x2) && (y < y2)) || ((x > x2) && (y > y2)));
    let obj = d3.select('#' + nodeConnections[i]);

    resizeElement(obj, x, y, x2, y2);
    drawLine(c[4], x, y, x2, y2, 0, 0);

    c[0 + num] = x;
    c[1 + num] = y;
  }

  node[0] = x;
  node[1] = y;
}



function getKey(event) {

  // Return key pressed

  if (event.isComposing || event.keyCode === 229) { return; }

  if (event.keyCode === 17) { activeKey = 17; }
  if (event.keyCode === 18) { activeKey = 18; }

  if (event.keyCode === 46) { deleteSelection(); }
}








// Other Functions

function getM() {

  // Return mouse input (with key combinations)

  let m;
  if (event.button == 0) {
    m = 0;
    if (activeKey == 17) {
      m = 2;
    } else if (activeKey == 18) {
      m = 3;
    }
  } else if (event.button == 2) {
    m = 2;
  }
  return m;
}



function createNode(id, x, y) {

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
    .style('margin-left', (x - 18) + 'px')
    .style('margin-top', (y - 34) + 'px')
    .style('z-index', '10')
    .on('mouseenter', nodeHover)
    .on('mouseleave', nodeHoverOut)
    .call(function(parent) {

      clicked = parent;

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
        .append('p')
        .classed('text_bubble', true)
        .attr('contenteditable', 'true')
        .on('input', nodeInput)
        .node().focus();
    });
}



function createConnection(id, x, y, x2, y2) {

  // Check if old or new id should be used and define it
  // Create id string
  // Create connection box

  let id2 = connectionCount;
  if (id != -1) { id2 = id; }
  let id3 = 'connection-' + id2;

  d3.select('body')
    .append('div')
    .attr('id', id3)
    .style('position', 'absolute')
    .style('z-index', '0')
    .call(function(parent) {
      connecting = parent;
    });

  createP5Canvas(id3);

  connecting.select('canvas')
    .style('width', '100%')
    .style('height', '100%');

  // Set connection position/size
  // Draw connection line

  resizeElement(connecting, x, y, x2, y2);
  drawLine(sketchId, x, y, x2, y2, 0, 0);
}



function createP5Canvas(pId) {

  // Create p5 sketch bound to given parent id

  new p5(sketch_connection, pId)

  function sketch_connection(p) {

    sketchId = p;
    sketchId.setup = function () {
      sketchId.createCanvas(0,0);
      sketchId.noFill();
      sketchId.strokeWeight(2);
    }
  }
}



function drawLine(sketchId, x, y, x2, y2, lineType, selected) {

  // Draw bezier line between connection points

  let w = Math.abs(x - x2);
  let h = Math.abs(y - y2);
  let dir = (((x < x2) && (y < y2)) || ((x > x2) && (y > y2)));

  sketchId.resizeCanvas(w, h);
  sketchId.clear();
  sketchId.stroke('#2F3138');
  if (selected) { sketchId.stroke(255); }

  if (!lineType) { sketchId.bezier(w * (!dir), 0, w / 2, 0, w / 2, h, w * dir, h); }
  else { sketchId.line(w * (!dir), 0, w * dir, h); }
}



function resizeElement(obj, x, y, x2, y2) {

  // Reposition and resize element

  obj.style('margin-left', Math.min(x, x2) + 'px')
  .style('margin-top', Math.min(y, y2) + 'px')
  .style('width', Math.abs(x - x2) + 'px')
  .style('height', Math.abs(y - y2) + 'px');
}



function deleteSelection() {

  // Delete selected nodes

  for (let i = 0; i < selectedNodes.length; i++) {

    selectedNodes[i].remove();
  }

  // Delete selected connetions

  for (let i = 0; i < selectedConnections.length; i++) {

      selectedConnections[i].remove();
  }
}



function deselectAll() {

  // Deselect selected nodes and connections

  for (let i = 0; i < selectedNodes.length; i++) {

    selectedNodes[i].select('p').style('background-color', '#2F3138');
  }

  selectedNodes.length = 0;
  selectedConnections.length = 0;
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



function intersects(a,b,c,d,p,q,r,s) {

  // returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)

  var det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
}



function isInBox(x, y, x2, y2, x3, y3) {

  if ((x > (Math.min(x2, x3))) && (x < (Math.max(x2, x3)))) {

    if ((y > (Math.min(y2, y3))) && (y < (Math.max(y2, y3)))) {

      return true;

    } else { return false; }

  } else { return false; }
}
