// ////////////////////////////////////////////////////////////////////////
// //
// //   Harvard Computer Science
// //   CS 175: Computer Graphics
// //   Professor Steven Gortler
// //
// ////////////////////////////////////////////////////////////////////////

// due to browser's same-origin policy, you should run a local server
// when playing with this. e.g. python -m SimpleHTTPServer.

// GLSUPPORT

function readAndCompileSingleShader(shaderHandle, fn) {
    // we are going to do something absolutely deplorable and
    // use a synchronous xml request
    var req = new XMLHttpRequest();
    req.open("GET", fn, false);
    req.send();
    ctx.shaderSource(shaderHandle, req.responseText);
    ctx.compileShader(shaderHandle);
    var info = ctx.getShaderInfoLog(shaderHandle);
    console.log(fn + ": " + info);
    var compiled = ctx.getShaderParameter(shaderHandle, ctx.COMPILE_STATUS);
    if (!compiled) {
        throw Error("fails to compile GL shader");
    }
}

function linkShader(programHandle, vs, fs) {
    ctx.attachShader(programHandle, vs);
    ctx.attachShader(programHandle, fs);

    ctx.linkProgram(programHandle);

    ctx.detachShader(programHandle, vs);
    ctx.detachShader(programHandle, fs);

    var linked = ctx.getProgramParameter(programHandle, ctx.LINK_STATUS);
    var info = ctx.getProgramInfoLog(programHandle);
    console.log("linking: " + info);

    if (!linked) {
        throw Error("fails to link shaders");
    }
}

function readAndCompileShader(programHandle, vertexShaderFileName, fragmentShaderFileName) {
    var vs = ctx.createShader(ctx.VERTEX_SHADER);
    var fs = ctx.createShader(ctx.FRAGMENT_SHADER);
    readAndCompileSingleShader(vs, vertexShaderFileName);
    readAndCompileSingleShader(fs, fragmentShaderFileName);

    linkShader(programHandle, vs, fs);
}



// // G L O B A L S ///////////////////////////////////////////////////

var g_width = window.innerWidth;    // screen width
var g_height = window.innerHeight;  // screen height
var g_leftClicked     = false;      // is the left mouse button down?
var g_rightClicked    = false;      // is the right mouse button down?
var g_objScale        = 1.0;        // scale factor for object
var g_aspectScale     = [1.0, 1.0]; // scale to account for screen aspect ratio
var g_leftClickX = 0;               // coordinates for mouse left click event
var g_leftClickY = 0;
var g_rightClickX = 0;              // coordinates for mouse right click event
var g_rightClickY = 0;

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("webgl");

function ShaderState(vsfn, fsfn)
{
    this.program = ctx.createProgram();

    readAndCompileShader(this.program, vsfn, fsfn);
    var h = this.program;

    // Retrieve handles to uniform variables
    this.h_uVertexScale = ctx.getUniformLocation(h, "uVertexScale");
    this.h_uTexUnit0 = ctx.getUniformLocation(h, "uTexUnit0");
    this.h_uTexUnit1 = ctx.getUniformLocation(h, "uTexUnit1");
    this.h_uAspectScale = ctx.getUniformLocation(h, "uAspectScale");

    // Retrieve handles to vertex attributes
    this.h_aPosition = ctx.getAttribLocation(h, "aPosition");
    this.h_aColor = ctx.getAttribLocation(h, "aColor");
    this.h_aTexCoord0 = ctx.getAttribLocation(h, "aTexCoord0");
    this.h_aTexCoord1 = ctx.getAttribLocation(h, "aTexCoord1");

    //checkGlErrors();
}

var g_numShaders = 1;
var g_shaderFiles = [
    ["./shaders/asst1-gl2.vshader", "./shaders/asst1-gl2.fshader"]
];
var g_shaderStates = [];
var g_tex0, g_tex1;

function SquareGeometry() {
    var posVbo = ctx.createBuffer();
    var texVbo = ctx.createBuffer();
    var colVbo = ctx.createBuffer();

    var sqPos = new Float32Array([
        -.5, -.5,
        .5, .5,
        .5, -.5,

        -.5, -.5,
        -.5, .5,
        .5, .5
    ]);


    var sqTex = new Float32Array([
      0, 0,
      1, 1,
      1, 0,

      0, 0,
      0, 1,
      1, 1
    ]);

    var sqCol =  new Float32Array([
      1, 0, 0,
      0, 1, 1,
      0, 0, 1,

      1, 0, 0,
      0, 1, 0,
      0, 1, 1
    ]);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, posVbo);
    ctx.bufferData(ctx.ARRAY_BUFFER, sqPos, ctx.STATIC_DRAW);
    //checkGlErrors();

    ctx.bindBuffer(ctx.ARRAY_BUFFER, texVbo);
    ctx.bufferData(ctx.ARRAY_BUFFER, sqTex, ctx.STATIC_DRAW);
    //checkGlErrors();

    ctx.bindBuffer(ctx.ARRAY_BUFFER, colVbo);
    ctx.bufferData(ctx.ARRAY_BUFFER, sqCol, ctx.STATIC_DRAW);
    //checkGlErrors();

    this.draw = function(curSS) {
        var numverts = 6;

        ctx.enableVertexAttribArray(curSS.h_aPosition);
        ctx.enableVertexAttribArray(curSS.h_aTexCoord0);
        ctx.enableVertexAttribArray(curSS.h_aTexCoord1);
        ctx.enableVertexAttribArray(curSS.h_aColor);

        ctx.bindBuffer(ctx.ARRAY_BUFFER, posVbo);
        ctx.vertexAttribPointer(curSS.h_aPosition, 2, ctx.FLOAT, false, 0, 0);

        ctx.bindBuffer(ctx.ARRAY_BUFFER, texVbo);
        ctx.vertexAttribPointer(curSS.h_aTexCoord0, 2, ctx.FLOAT, false, 0, 0);

        ctx.bindBuffer(ctx.ARRAY_BUFFER, texVbo);
        ctx.vertexAttribPointer(curSS.h_aTexCoord1, 2, ctx.FLOAT, false, 0, 0);

        ctx.bindBuffer(ctx.ARRAY_BUFFER, colVbo);
        ctx.vertexAttribPointer(curSS.h_aColor, 3, ctx.FLOAT, false, 0, 0);

        ctx.drawArrays(ctx.TRIANGLES, 0, numverts);

        ctx.disableVertexAttribArray(curSS.h_aPosition);
        ctx.disableVertexAttribArray(curSS.h_aColor);
        ctx.disableVertexAttribArray(curSS.h_aTexCoord0);
        ctx.disableVertexAttribArray(curSS.h_aTexCoord1);
    }
}

var g_square;

// struct SquareGeometry {
//   GlBufferObject posVbo, texVbo, colVbo;

//   SquareGeometry() {
//     static GLfloat sqPos[12] = {
//       -.5, -.5,
//       .5,  .5,
//       .5,  -.5,

//       -.5, -.5,
//       -.5, .5,
//       .5,  .5
//     };

//     static GLfloat sqTex[12] = {
//       0, 0,
//       1, 1,
//       1, 0,

//       0, 0,
//       0, 1,
//       1, 1
//     };

//     static GLfloat sqCol[18] =  {
//       1, 0, 0,
//       0, 1, 1,
//       0, 0, 1,

//       1, 0, 0,
//       0, 1, 0,
//       0, 1, 1
//     };

//     glBindBuffer(GL_ARRAY_BUFFER, posVbo);
//     glBufferData(
//       GL_ARRAY_BUFFER,
//       12*sizeof(GLfloat),
//       sqPos,
//       GL_STATIC_DRAW);
//     checkGlErrors();

//     glBindBuffer(GL_ARRAY_BUFFER, texVbo);
//     glBufferData(
//       GL_ARRAY_BUFFER,
//       12*sizeof(GLfloat),
//       sqTex,
//       GL_STATIC_DRAW);
//     checkGlErrors();

//     glBindBuffer(GL_ARRAY_BUFFER, colVbo);
//     glBufferData(
//       GL_ARRAY_BUFFER,
//       18*sizeof(GLfloat),
//       sqCol,
//       GL_STATIC_DRAW);
//     checkGlErrors();
//   }

//   void draw(const ShaderState& curSS) {
//     int numverts=6;
//     safe_glEnableVertexAttribArray(curSS.h_aPosition);
//     safe_glEnableVertexAttribArray(curSS.h_aTexCoord0);
//     safe_glEnableVertexAttribArray(curSS.h_aTexCoord1);
//     safe_glEnableVertexAttribArray(curSS.h_aColor);

//     glBindBuffer(GL_ARRAY_BUFFER, posVbo);
//     safe_glVertexAttribPointer(curSS.h_aPosition,
//                                2, GL_FLOAT, GL_FALSE, 0, 0);

//     glBindBuffer(GL_ARRAY_BUFFER, texVbo);
//     safe_glVertexAttribPointer(curSS.h_aTexCoord0,
//                                2, GL_FLOAT, GL_FALSE, 0, 0);

//     glBindBuffer(GL_ARRAY_BUFFER, texVbo);
//     safe_glVertexAttribPointer(curSS.h_aTexCoord1,
//                                2, GL_FLOAT, GL_FALSE, 0, 0);

//     glBindBuffer(GL_ARRAY_BUFFER, colVbo);
//     safe_glVertexAttribPointer(curSS.h_aColor,
//                                3, GL_FLOAT, GL_FALSE, 0, 0);

//     glDrawArrays(GL_TRIANGLES,0,numverts);

//     safe_glDisableVertexAttribArray(curSS.h_aPosition);
//     safe_glDisableVertexAttribArray(curSS.h_aColor);
//     safe_glDisableVertexAttribArray(curSS.h_aTexCoord0);
//     safe_glDisableVertexAttribArray(curSS.h_aTexCoord1);
//   }
// };

// // C A L L B A C K S ///////////////////////////////////////////////////

// // _____________________________________________________
// //|                                                     |
// //|  display                                            |
// //|_____________________________________________________|
// ///
// ///  Whenever OpenGL requires a screen refresh
// ///  it will call display() to draw the scene.
// ///  We specify that this is the correct function
// ///  to call with the glutDisplayFunc() function
// ///  during initialization

function display() {
    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
    var curSS = g_shaderStates[0];
    ctx.useProgram(curSS.program);
    ctx.uniform1i(curSS.h_uTexUnit0, 0);
    ctx.uniform1i(curSS.h_uTexUnit1, 1);
    ctx.uniform1f(curSS.h_uVertexScale, g_objScale);
    ctx.uniform2f(curSS.h_uAspectScale, g_aspectScale[0], g_aspectScale[1]);
    g_square.draw(curSS);

    // do not need to swap buffers in WebGL?
}


// // _____________________________________________________
// //|                                                     |
// //|  reshape                                            |
// //|_____________________________________________________|
// ///
// ///  Whenever a window is resized, a "resize" event is
// ///  generated and glut is told to call this reshape
// ///  callback function to handle it appropriately.

function reshape(w, h) {
  g_width = w;
  g_height = h;
  canvas.width = w;
  canvas.height = h;
  ctx.viewport(0, 0, w, h);
  g_aspectScale[0] = w > h ? w/h : 1.0;
  g_aspectScale[1] = h > w ? h/w : 1.0;

  window.requestAnimationFrame(display);
}


// // _____________________________________________________
// //|                                                     |
// //|  mouse                                              |
// //|_____________________________________________________|
// ///
// ///  Whenever a mouse button is clicked, a "mouse" event
// ///  is generated and this mouse callback function is
// ///  called to handle the user input.

var LEFT_BUTTON = 0;
var RIGHT_BUTTON = 2;

function mouse(button, x, y) {
  if (button == LEFT_BUTTON) {
      // right mouse button has been clicked
      g_leftClicked = true;
      g_leftClickX = x;
      g_leftClickY = g_height - y - 1;
  } else if (button == RIGHT_BUTTON) {
      g_rightClicked = true;
      g_rightClickX = x;
      g_rightClickY = g_height - y - 1;
  }
}


// // _____________________________________________________
// //|                                                     |
// //|  motion                                             |
// //|_____________________________________________________|
// ///
// ///  Whenever the mouse is moved while a button is pressed,
// ///  a "mouse move" event is triggered and this callback is
// ///  called to handle the event.

function motion(x, y) {
  var newx = x;
  var newy = g_height - y - 1;
  if (g_leftClicked) {
    g_leftClickX = newx;
    g_leftClickY = newy;
  }
  if (g_rightClicked) {
    var deltax = (newx - g_rightClickX) * 0.02;
    g_objScale += deltax;

    g_rightClickX = newx;
    g_rightClickY = newy;
  }

//   glutPostRedisplay();
  window.requestAnimationFrame(display);
}


// void keyboard(unsigned char key, int x, int y) {
//   switch (key) {
//   case 'h':
//     cout << " ============== H E L P ==============\n\n"
//     << "h\t\thelp menu\n"
//     << "s\t\tsave screenshot\n"
//     << "drag right mouse to change square size\n";
//     break;
//   case 'q':
//     exit(0);
//   case 's':
//     glFinish();
//     writePpmScreenshot(g_width, g_height, "out.ppm");
//     break;
//   }
// }



// // H E L P E R    F U N C T I O N S ////////////////////////////////////

function initBrowserState() {
    ctx.enable(ctx.DEPTH_TEST);
    canvas.width = g_width;
    canvas.height = g_height;
    document.title = "CS 175: Hello World";

    window.requestAnimationFrame(display);

    window.addEventListener('resize', function(e) {
        reshape(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', function(e) {
        motion(e.pageX, e.pageY);
    });

    window.addEventListener('mousedown', function(e) {
        mouse(e.button, e.pageX, e.pageY);
    });

    window.addEventListener('mouseup', function(e) {
        g_leftClicked, g_rightClicked = false;
    });

    window.addEventListener('keypress', function(e) {
        motion(e.pageX, e.pageY);
    });

    document.addEventListener('contextmenu', function(e) {
        // stop the right click context menu from appearing...
        e.preventDefault();
    });

    // no keyboard for now
}

function initGLState() {
    ctx.clearColor(128./255, 200./255, 1, 0);
    ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, true);

    // ignore srgb for now...
}

function initShaders() {
    g_shaderStates.length = g_numShaders;
    for (var i = 0; i < g_numShaders; ++i) {
        g_shaderStates[i] = new ShaderState(g_shaderFiles[i][0], g_shaderFiles[i][1]);
    }
}

function initGeometry() {
    g_square = new SquareGeometry();
}

function loadTexture(texHandle, ppmFilename) {
    var texWidth, texHeight;
    ppmRead(ppmFilename, texWidth, texHandle, pixData);
}

function loadTexture(texture, TEXTURE_NUMBER, fname) {
    texture.image = new Image();
    texture.image.onload = function() {
        ctx.activeTexture(TEXTURE_NUMBER);
        ctx.bindTexture(ctx.TEXTURE_2D, texture);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, texture.image);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    }
    texture.image.src = fname;
}

function initTextures() {
    g_tex0 = ctx.createTexture();
    g_tex1 = ctx.createTexture();

    loadTexture(g_tex0, ctx.TEXTURE0, "smiley.png");
    loadTexture(g_tex1, ctx.TEXTURE1, "reachup.png");
}

function main() {
    try {
        initBrowserState();
        initGLState();
        initShaders();
        initGeometry();
        initTextures();

        reshape(g_width, g_height);
    } catch (e) {
        console.log("Exception caught: " + e.message);
    }
}

main();
