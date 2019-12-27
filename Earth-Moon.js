//khai báo biến
VSHADER_SOURCE =
  'attribute vec4 a_Normal;\n' +	// phap tuyen
  'attribute vec4 a_Position;\n' +
'attribute vec4 a_Color;\n' +
 'attribute vec2 a_TexCoord;\n' + 
  
  'uniform mat4 u_ModelMatrix;\n' +
'uniform mat4 u_ProjMatrix;\n' +
'uniform mat4 u_ViewMatrix;\n' +
 'uniform mat4 u_NormalMatrix;\n' +   // Transformation matrix of the normal
  
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' +
'varying vec4 v_Color;\n' +
'varying vec2 v_TexCoord;\n' +

'void main() {\n' +
'  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
// gán biến trung gian màu sắc để gọi trong fshader( vì fshader k đọc được biến thuộc tính)
'  v_TexCoord = a_TexCoord;\n' +
 '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_Color = a_Color;\n' + 

'}\n';

// Fragment shader program
var FSHADER_SOURCE =
'#define PI 3.141592654;\n' +
'precision mediump float;\n' + // Precision qualifier (See Chapter 6)
'uniform sampler2D u_Sampler;\n' +
 'uniform vec4 u_LightDirection;\n' +  // Light direction (in the world coordinate, normalized)
'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightPosition;\n' +  // Position of the light source
  'uniform float u_Intensity;\n' + // Cuong do sang
  'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' +
  'varying vec2 v_TexCoord;\n' +
  'varying vec4 v_Color;\n' +
  

  
  
'void main() {\n' +
'  vec3 normal = normalize(v_Normal);\n' +

     // Calculate the light direction and make its length 1.
  '  vec3 lightDirection = normalize(u_LightPosition - v_Position);\n' +
     // The dot product of the light direction and the orientation of a surface (the normal)
'  float nDotL = 1.0 * max(dot(v_Normal, lightDirection), 0.0);\n' +
     // Calculate the final color from diffuse reflection and ambient reflection
  '  vec3 diffuse = u_LightColor * v_Color.rgb * nDotL;\n' +
  '  vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +
  '  gl_FragColor = vec4(diffuse + ambient, v_Color.a);\n' +
'  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +







'}\n';

// bước nhảy khi quay
var ANGLE_STEP = 25.0/1000;
//
var angleToDegree = 2*Math.PI/360;
var revolution = 0.9;

// bước nhảy khi ấn nút sang trái or phải
var VIEW_ANGLE_STEP = 20;
//
var VIEW_REDUIS = 2;

var currentViewAngle = 270;
// bước nhảy phóng to thu nhỏ
var big  = 60;
var zoom = 1;
//
var earth;
var moon;
function main() {
    // lấy phần tử canvas( được tạo trong html)
    var canvas = document.getElementById('webgl');
  
	
	document.onkeydown = function (ev) { keydown(ev); };

  canvas.onmousedown = function (ev) { mouseDrag(ev, canvas); };
  canvas.onmousemove = function (ev) { mouseDrag(ev, canvas); };
  document.onmouseup = function (ev) { mouseDrag(ev, canvas); };
  canvas.onwheel = function (ev) { mouseDrag(ev, canvas); };

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
      console.log('Failed to get the rendering context for WebGL');
      return;
    }
  
    // Khởi tạo ngôn ngữ tô bóng
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
      console.log('Failed to intialize shaders.');
      return;
    }

	//Khởi tạo kích thước , tọa độ khối cầu
	// bán kính: 0.5, sector: 36, stack: 36
    earth = new Sphere(0.5, 36, 36);
	// buildVertex: 
    earth.buildVertex();
	// vertexPosArray: miêu tả thuộc tính đỉnh được lưu trữ trong bộ đệm
    var earthNum = earth.vertexPosArray.length;
	
    moon = new Sphere(0.2, 36, 36);
    moon.buildVertex();
    var moonNum = moon.vertexPosArray.length;
	// lấy vị trí lưu  trữ cho biến đồng nhất
	/////////////////////
	var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
      console.log('Failed to get the storage location of u_ModelMatrix');
      return;
    }
 // Set the light color (white)
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
  // Set the light direction (in the world coordinate)
  gl.uniform3f(u_LightPosition, 2.3, 4.0, 3.5);
  // Set the ambient light
  gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    if (!u_ProjMatrix) {
      console.log('Failed to get the storage location of u_ProjMatrix');
      return;
    }

    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ViewMatrix) {
      console.log('Failed to get the storage location of u_ViewMatrix');
      return;
    }

    // màu mặc định của canvas
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
  
    // thiết lập kết cấu
    if (!initTextures(gl, earthNum)) {
      console.log('Failed to intialize the texture.');
      return;
    }

    // Góc xoay ban đầu
    var currentAngle = 0.0;
    
    // Tạo mới matrix4
    var modelMatrix = new Matrix4();
    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var normalMatrix = new Matrix4(); // Transformation matrix for normals

	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	
	 gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	// hàm ẩn danh tick
    var tick = function()
    {
      currentAngle = getAngle(currentAngle);
      var viewX = Math.cos(currentViewAngle*angleToDegree);
      var viewZ = Math.sin(currentViewAngle*angleToDegree);
	  // thiết lập điểm nhìn
      viewMatrix.setLookAt(viewX * VIEW_REDUIS, 0.0, viewZ * VIEW_REDUIS, 0.0, 0.0, 0.0, 0, 1, 0)
	 viewMatrix.multiply(modelMatrix);
	  
	  // thiết lập phép chiếu phối cảnh
      projMatrix.setPerspective(big, canvas.width/canvas.height, 1, 10);
      
      // Đặt màu rõ ràng và cho phép khử mặt khuất
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.enable(gl.DEPTH_TEST);

      // Khử mặt khuất
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	  
		//  gọi 2 hàm vẽ trái đất, mặt trăng
      drawEarth(gl, earthNum, currentAngle, modelMatrix, projMatrix, viewMatrix, u_ModelMatrix, u_ProjMatrix, u_ViewMatrix);
      drawMoon(gl, moonNum, currentAngle, modelMatrix, projMatrix, viewMatrix,  u_ModelMatrix, u_ProjMatrix, u_ViewMatrix);
      
	  // lời gọi hàm xoay liên tục
      requestAnimationFrame(tick, canvas);
    };

    tick();
    
  }
//
  function drawEarth(gl, n, currentAngle, modelMatrix, projMatrix, viewMatrix, u_ModelMatrix, u_ProjMatrix, u_ViewMatrix)
  {
	// gọi hàm pushModelMatrix
    pushModelMatrix(modelMatrix);
    
    modelMatrix.translate(0, 0, 0);
    // xoay theo trục oy
    modelMatrix.rotate(currentAngle, 0, 1, 0);
	// truyền ma trận cho biến đồng nhất
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    
    // vẽ trái đất
    initSphereBuffer(gl, earth.vertexPosArray, earth.vertexIndicesArray);
	//  (vị trí, 0: đỉnh)
    gl.uniform1i(u_Sampler, 0);
	//
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);;
	// gọi hàm popModelMatrix
    modelMatrix.set(popModelMatrix());  
  }

  function drawMoon(gl, n, currentAngle, modelMatrix, projMatrix, viewMatrix, u_ModelMatrix, u_ProjMatrix, u_ViewMatrix)
  {
    pushModelMatrix(modelMatrix);
    
    var x = Math.cos(currentAngle*angleToDegree);
    var y = Math.sin(currentAngle*angleToDegree);
    
    modelMatrix.translate(x*revolution, y*revolution, 0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    initSphereBuffer(gl, moon.vertexPosArray, moon.vertexIndicesArray);
    
    gl.uniform1i(u_Sampler, 1);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
    modelMatrix.set(popModelMatrix());
  }

  var g_last = Date.now();
  var now;
  var elapsed;
  // hàm lấy góc quay hiện tại
  function getAngle(currentAngle)
  {
    now = Date.now();
    elapsed = now - g_last;
    g_last = now;
    currentAngle += elapsed*ANGLE_STEP;
    return currentAngle % 360;
  }

	//khai báo mảng để push pop phần tử
  var mvMatrixStack = [];

  function pushModelMatrix(mvMatrix) {
      var copy = new Matrix4()
      copy.set(mvMatrix);
      mvMatrixStack.push(copy);
  }

  function popModelMatrix() {
      if (mvMatrixStack.length == 0) {
          throw "Invalid popMatrix!";
      }
      return mvMatrixStack.pop();
  }
  
// hàm vẽ khối cầu
// latitudinalNum, longitudinalNum???
function Sphere(radius,latitudinalNum,longitudinalNum)
{
	"use strict";
	this.radius = radius;
	this.latitudinalNum = latitudinalNum;
	this.longitudinalNum = longitudinalNum;
  this.vertexPosArray = [];
	this.vertexNormalArray = [];
  this.vertexIndicesArray = [];
}

Sphere.prototype.buildVertex = function(){
	

   var latPace = 1.0 / (this.latitudinalNum-1);
   var longPace =  1.0 / (this.longitudinalNum-1);

   // pos & normal
   for(var i=0;i<this.latitudinalNum;i++){
	   for(var j=0;j<this.longitudinalNum;j++){
		   
		   var x =  Math.cos(2*Math.PI*j*longPace) * Math.sin(Math.PI*i*latPace);
		   var y =  Math.sin(-Math.PI/2 + Math.PI*i*latPace); 
       var z =  Math.sin(2*Math.PI*j*longPace) * Math.sin(Math.PI*i*latPace);
       
		   this.vertexPosArray.push(x*this.radius);
		   this.vertexPosArray.push(y*this.radius);
       this.vertexPosArray.push(z*this.radius);
       //color
       this.vertexPosArray.push(j*longPace);       
       this.vertexPosArray.push(i*latPace);
       
		   this.vertexNormalArray.push(x);
		   this.vertexNormalArray.push(y);
       this.vertexNormalArray.push(z);

	   }
   }
   
   // indices
   for(var i=0;i<this.latitudinalNum-1;i++){
	   for(var j=0;j<this.longitudinalNum-1;j++){
		   this.vertexIndicesArray.push(i*this.longitudinalNum+j);
		   this.vertexIndicesArray.push(i*this.longitudinalNum+ (j+1) );
		   this.vertexIndicesArray.push( (i+1) *this.longitudinalNum+j);
		   
		   this.vertexIndicesArray.push(i*this.longitudinalNum+ (j+1) );
		   this.vertexIndicesArray.push( (i+1) *this.longitudinalNum+ (j+1) );
		   this.vertexIndicesArray.push( (i+1) *this.longitudinalNum+j);
	   }
   }
  }

// ???
   function initSphereBuffer(gl, vertexPosArray, indicesArray)
   {
	   // tạo mới bộ đệm
    vertexColorBuffer = gl.createBuffer();
    indexBuffer = gl.createBuffer();

    var vertexPosTypedArray = new Float32Array(vertexPosArray);
    var indicesTypedArray = new Uint16Array(indicesArray);
	// gắn vào 1 target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
	// truyền dữ liệu
    gl.bufferData(gl.ARRAY_BUFFER, vertexPosTypedArray, gl.STATIC_DRAW);

    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
      console.log('Failed to get the storage location of a_Position');
      return -1;
    }
	// định nghĩa spherepossize( kích thước số byte phần tử trong mảng vertical được lưu trữ trong spherepossize)
    var spherePosFSIZE = vertexPosTypedArray.BYTES_PER_ELEMENT;    
    // gắn bộ đệm đối tượng cho biến thuộc tính
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, spherePosFSIZE * 5, 0);
	// cho phép kích hoạt biến thuộc tính
    gl.enableVertexAttribArray(a_Position);
  
    // lấy vị trí lưu trũ
    var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
    if (a_TexCoord < 0) {
      console.log('Failed to get the storage location of a_TexCoord');
      return -1;
    }
    // gắn bộ đệm cho biến
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, spherePosFSIZE * 5, spherePosFSIZE * 3);
    gl.enableVertexAttribArray(a_TexCoord); 
  
	// viết chỉ số tới bộ đệm đối tượng
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesTypedArray, gl.STATIC_DRAW);
   }

   var u_Sampler;
   function initTextures(gl, n) {
    var texture = gl.createTexture();   // tạo đối tượng kết cấu
    if (!texture) {
      console.log('Failed to create the texture object');
      return false;
    }

    var texture2 = gl.createTexture();   // tạo đối tượng kết cấu
    if (!texture2) {
      console.log('Failed to create the texture object');
      return false;
    }
 
	
    u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    if (!u_Sampler) {
      console.log('Failed to get the storage location of u_Sampler');
      return false;
    }
    var earthImage = new Image();  //tạo đối tượng imgae
    if (!earthImage) {
      console.log('Failed to create the image object');
      return false;
    }

    var moonImage = new Image();  // tạo đối tượng imgae
    if (!moonImage) {
      console.log('Failed to create the image object');
      return false;
    }
	
	
	// ban đầu gán bằng false
    var isEarthLoaded = false;
    var isMoonLoaded = false;
	
	// onload: khi trình duyệt đã load xong mọi thứ(imgae, js, css) thì đoạn code bên trong mới được chạy
    earthImage.onload = function(){ 
	// ban đầu gán bằng false, khi chạy từng hàm gán bằng true để nó duyệt đúng 1 lần
      isEarthLoaded = true;
      if(isEarthLoaded == true)
      {
		  // n: số đỉnh, texture: đối tượng kết cấu, u_Sampler: biến đồng nhất
        loadTexture(gl, n, texture, u_Sampler, earthImage, 0);
      }
    };

    moonImage.onload = function(){ 
      isMoonLoaded = true;
      if(isMoonLoaded == true)
      {
        loadTexture(gl, n, texture2, u_Sampler, moonImage, 1);
      }
    };

	
	

    // trình duyệt tải ảnh lên
    earthImage.src = 'earth.jpg';
    moonImage.src = 'moon.jpg';
	
    
    return true;
  }

  function loadTexture(gl, n, texture, u_Sampler, image, texUnit) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
    // Kích hoạt đơn vị kết cấu0
    if(texUnit == 0)
    {
      gl.activeTexture(gl.TEXTURE0);
    }else if(texUnit == 1)
    {
      gl.activeTexture(gl.TEXTURE1);
    }
	
	else
    {
      console.log('Failed to activeTexture');
      return false;
    }
    // gắn đối tượng texture vào đối tượng
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    // thiết lập tham số texture của 1 đối tượng kết cấu
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // gắn 1 ảnh kết cấu cho 1 đối tượng kết cấu
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    
  }
  
  
  
  const PI = 3.141592654;
var g_isDragging = false;

//var a = 30.0 * PI / 360;
//var b = 0.0;


var x_origin = 0.0;
var b_origin = 0.0;
var y_origin = 0.0;
var a_origin = 0.0;


function mouseDrag(ev, canvas) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect(ev, canvas);

  x = ((x - rect.left) - (canvas.height / 2)) / (canvas.height / 2);
  y = ((canvas.width / 2) - (y - rect.top)) / (canvas.width / 2);

  // console.log('in mouseDrag(): x = ' + x + ' y = ' + y);
  switch (ev.type) {
    case 'mousedown':
      g_isDragging = true;
      x_origin = x;
      b_origin = currentViewAngle;
      y_origin = y;
      a_origin = currentViewAngle;
      break;
    case 'mouseup':
      g_isDragging = false;
      break;
    case 'mousemove':
      if (g_isDragging == true) {
        currentViewAngle = a_origin + (y - y_origin) * -1.5;
        VIEW_ANGLE_STEP = b_origin - (x - x_origin) * -1.5;
        standardize();
      }
      break;
    case 'wheel':
      if (ev.wheelDelta < 0)
        big += 2;
      else
        big = ((big - 2) > 0) ? (big - 2) : 2;
      break;
    default:
      console.log('in mouseDrag(): Unknown mouse event');
  }
  // console.log(ev)
}

  
  

 function keydown(ev) {
    switch (ev.keyCode) {
      case 39: // Phím mũi tên phải -> xoay vòng dương của arm1 quanh trục y
        currentViewAngle = (currentViewAngle + VIEW_ANGLE_STEP) % 360;
        break;
      case 37: // Phím mũi tên trái <- xoay vòng âm của arm1 quanh trục y
        currentViewAngle = (currentViewAngle - VIEW_ANGLE_STEP) % 360;
        break;
		
		case 40: // Phím mũi tên lên -> xoay vòng âm của arm1 quanh trục y
        big = (big + zoom) % 360;
        break;
		
		case 38: // Phím mũi tên xuống -> xoay vòng âm của arm1 quanh trục y
        big = (big - zoom) % 360;;
        break;
      default: return; // Bỏ qua sự kiện nếu không có hành động nào
    }
  }