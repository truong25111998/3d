var VSHADER_SOURCE =
'attribute vec4 a_Position;\n' +	 // vị trí khối cầu
'attribute vec4 a_Normal;\n' +		 // biến pháp tuyến
'attribute vec2 a_TexCoord;\n' +	 // tọa độ kết cấu
'uniform mat4 u_NormalMatrix;\n' +   // Ma trận biến đổi của normal
'uniform vec3 u_LightColor;\n' +     // Cường độ ánh sáng
'uniform vec3 u_LightPosition;\n' +  // vị trí nguồn sáng
'uniform vec3 u_AmbientLight;\n' +   // màu ánh sáng xung quanh
'uniform mat4 u_ModelMatrix;\n' +	 // ma trận biến đổi
'uniform mat4 u_ProjMatrix;\n' +	 // phép chiếu trực giao
'uniform mat4 u_ViewMatrix;\n' +	 // ma trận điểm nhìn
'varying vec4 v_Color;\n' +
'varying vec2 v_TexCoord;\n' +
'void main() {\n' +
'  vec4 color = vec4(1.0, 1.0, 1.0, 1.0);\n' + 										// màu mặc định khối cầu
'  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +					// biến đổi vector pháp tuyến
'  vec4 vertexPosition = u_ModelMatrix * a_Position;\n' +
'  vec3 lightDirection = normalize(u_LightPosition - vec3(vertexPosition));\n' +
'  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +						// hướng ánh sáng và định hướng của 1 bề mặt
'  vec3 diffuse = u_LightColor * color.rgb * nDotL;\n' +							// tính toán màu sắc do sự khuếch tán khuếch tán
'  vec3 ambient = u_AmbientLight * color.rgb;\n' +
'  v_Color = vec4(diffuse + ambient, color.a);\n' + 

'  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +		// biến đối vị trí dựa vào các ma trận
'  v_TexCoord = a_TexCoord;\n' +
'}\n';

var FSHADER_SOURCE =
'precision mediump float;\n' + 
'uniform sampler2D u_Sampler;\n' +													// biến để dán ảnh 
'varying vec4 v_Color;\n' +															// biến trung gian ánh sáng xung quanh
'varying vec2 v_TexCoord;\n' +														// biến trung gian tọa độ kết cấu
'void main() {\n' +
'  gl_FragColor = v_Color + texture2D(u_Sampler, v_TexCoord);\n' +					// quá trình nhận dữ liệu ảnh, ánh xạ tọa độ kết cấu, màu sắc
'}\n';

var ANGLE_STEP = 45.0/1000;															// bước nhảy(khi xoay trái đất)
var angleToDegree = Math.PI/180;													// chuyển đổi góc
var revolution = 0.5;																

var big  = 60;																		
var zoom = 1;																		
var earth;																			
var moon;																			
function main() {
  var canvas = document.getElementById('webgl');									// lấy lại phần tủ trong canvas
  document.onkeydown = function (ev) { keydown(ev); };								// đăng ký xử lý sự kiện để được gọi trên phím bấm
  document.onmouseup = function (ev) { mouseDrag(ev, canvas); };					// đăng ký xử lý sự kiện để được gọi trên di chuột
  canvas.onmousedown = function (ev) { mouseDrag(ev, canvas); };
  canvas.onmousemove = function (ev) { mouseDrag(ev, canvas); };
  canvas.onwheel = function (ev) { mouseDrag(ev, canvas); };						// Sự kiện onwheel xảy ra khi bánh xe chuột được cuộn lên hoặc xuống trên một khối cầu

    var gl = getWebGLContext(canvas);												// Nhận bối cảnh kết xuất cho WebGL
    if (!gl) {
      console.log('Failed to get the rendering context for WebGL');
      return;
    }
  
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {							// khởi tạo ngôn ngữ tô bóng
      console.log('Failed to intialize shaders.');
      return;
    }
	
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');			// lấy vị trí lưu trữ các biến
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
  if ( !u_NormalMatrix || !u_LightColor || !u_LightPosition　|| !u_AmbientLight) { 	// Lỗi cho vị trí lưu trữ
    console.log('Failed to get the storage location');								
    return;
  }
  
  var g_ambientLight = [0.1, 0.1, 0.1]												// fix cứng giá trị cho biến thuộc tính về ánh sáng
  gl.uniform3f(u_LightColor, 1, 1, 1);									// truyền biến thuộc tính đến giá trị lưu trữ
  gl.uniform3f(u_LightPosition, 5.0, 8.0, 7.0);									// Đặt hướng ánh sáng (trong tọa độ thế giới)	
  gl.uniform3f(u_AmbientLight, g_ambientLight[0], g_ambientLight[1], g_ambientLight[2]);  // Đặt ánh sáng xung quanh

    earth = new Sphere(0.3, 36, 36);												// khởi tạo kích thước khối cầu
    earth.buildVertex();															// xây dựng các đỉnh của khối cầu				
    var earthNum = earth.vertexPosArray.length;										// lấy số lượng các vị trí của đỉnh khối cầu
	
    moon = new Sphere(0.1, 36, 36);
    moon.buildVertex();
    var moonNum = moon.vertexPosArray.length;
	
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');			// gán biến vào vị trí lưu trữ
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');  
    gl.clearColor(0.0, 0.0, 0.0, 0.0);												// màu nền mặc định của canvas( đen)
  
    if (!initTextures(gl, earthNum)) {
      console.log('Failed to intialize the texture.');
      return;
    }
	 
    var currentAngle = 10;															// góc xoay ban đầu   
    var modelMatrix = new Matrix4();												// tạo mới ma trận kiểu matrix4
    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    
    var tick = function()															// hàm ẩn danh tick
    {
     currentAngle = getAngle(currentAngle);
      
      viewMatrix.setLookAt(D * Math.cos(2*a) * Math.sin(b),							// thiết lập điểm nhìn
      D * Math.sin(-Math.PI/2 + b),																// ?
      D * Math.sin(2*a) * Math.sin(b), 0.0, 0.0, 0.0, 0, 1, 0)						// ?
	  
      projMatrix.setPerspective(big, canvas.width/canvas.height, 0.4, 10);			// chiếu phối cánh
      
      gl.clearColor(0.0, 0.0, 0.0, 0.0);											// Đặt màu rõ ràng và cho phép khử mặt khuất
      gl.enable(gl.DEPTH_TEST);														// Kích hoạt khử mặt khuất
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	  
	  // vẽ 2 khối cầu với 9 tham số 
      drawEarth(gl, earthNum, currentAngle, modelMatrix, projMatrix, viewMatrix, u_ModelMatrix, u_ProjMatrix, u_ViewMatrix);
      drawMoon(gl, moonNum, currentAngle, modelMatrix, projMatrix, viewMatrix,  u_ModelMatrix, u_ProjMatrix, u_ViewMatrix);
      
      requestAnimationFrame(tick, canvas);											// lặp lại lời gọi hàm tick
    };
    tick();
  }
  // hàm vẽ trái đất
  function drawEarth(gl, n, currentAngle, modelMatrix, projMatrix, viewMatrix, u_ModelMatrix, u_ProjMatrix, u_ViewMatrix)
  {
    pushModelMatrix(modelMatrix);													// Đẩy ma trận đã chỉ định vào ngăn xếp ma trận kết xuất
   
    modelMatrix.rotate(currentAngle, 0, 1, 0);										// xoay 1 góc currentAngle
	
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);				// truyền ma trận đến vertex shaders
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    
    initSphereBuffer(gl, earth.vertexPosArray, earth.vertexIndicesArray);			// Vẽ trái đất
    gl.uniform1i(u_Sampler, 0);														// truyền đơn vị kết cấu tới fragment shader
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);					// xl bang chi so

    modelMatrix.set(popModelMatrix());  											// Xóa ma trận kết xuất hiện từ ngăn xếp và khôi phục lại ma trận trước đó
  }

  function drawMoon(gl, n, currentAngle, modelMatrix, projMatrix, viewMatrix, u_ModelMatrix, u_ProjMatrix, u_ViewMatrix)
  {
    pushModelMatrix(modelMatrix);
    
    var x = Math.cos(currentAngle*angleToDegree);									// tien tien theo
    var y = Math.sin(currentAngle*angleToDegree);
    
    modelMatrix.translate(x*revolution, 0, y*revolution);							
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    initSphereBuffer(gl, moon.vertexPosArray, moon.vertexIndicesArray);
    
    gl.uniform1i(u_Sampler, 1);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
    modelMatrix.set(popModelMatrix());
  }

  var g_last = Date.now();															// thời gian gần nhất mà hàm gọi
  var now;																			
  var elapsed;
  function getAngle(currentAngle)
  {
    now = Date.now();																// tính thời gian trôi qua
    elapsed = now - g_last;
    g_last = now;
    currentAngle += elapsed*ANGLE_STEP;
    return currentAngle % 360;
  }

  var mvMatrixStack = [];															// Khởi tạo mảng rỗng
  function pushModelMatrix(mvMatrix) {												// Hàm đẩy ma trận đã chỉ định vào ngăn xếp ma trận kết xuất
      var copy = new Matrix4()														// Khởi tạo biến copy
      copy.set(mvMatrix);															// Lấy phần tử trong ma trận matrix4 lưu vào mảng
      mvMatrixStack.push(copy);														// đẩy các phần tử từ mảng vào trong biến copy
  }

  function popModelMatrix() {														// Định nghĩa phương thức khôi phục ma trận trước đó
      if (mvMatrixStack.length == 0) {												// nếu mảng k rỗng thì trả về mảng 
          throw "Invalid popMatrix!";												
      }
      return mvMatrixStack.pop();													
  }
  

function Sphere(radius,latitudinalNum,longitudinalNum)								// (bán kính, ?, ?)
{
	"use strict";																	// tất cả code phía dưới được kiểm soát chặt chẽ về cú pháp
	this.radius = radius;															// bán kính
	this.latitudinalNum = latitudinalNum;											// ?
	this.longitudinalNum = longitudinalNum;
	this.vertexPosArray = [];														// mảng vị trí các đỉnh
	this.vertexNormalArray = [];													// mảng vector pháp tuyến
	this.vertexIndicesArray = [];													// mảng chỉ số đỉnh
}

Sphere.prototype.buildVertex = function(){											// ?
	
   var latPace = 1.0 / (this.latitudinalNum-6);
   var longPace =  1.0 / (this.longitudinalNum-6);

   for(var i=0;i<this.latitudinalNum;i++){											// // pos & normal
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
	
   for(var i=0;i<this.latitudinalNum-1;i++){										// chỉ số
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

   function initSphereBuffer(gl, vertexPosArray, indicesArray)						
   {
    vertexColorBuffer = gl.createBuffer();											// khởi tạo bộ đệm đối tượng
    indexBuffer = gl.createBuffer();

    var vertexPosTypedArray = new Float32Array(vertexPosArray);						// lưu biến vị trí các đỉnh vào mảng
    var indicesTypedArray = new Uint16Array(indicesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);								// gắn vào 1 bộ đệm đối tượng
    gl.bufferData(gl.ARRAY_BUFFER, vertexPosTypedArray, gl.STATIC_DRAW);			// truyền giá trị cho bộ đệm

    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');				// lấy vị trí lưu trữ cho biến
    var spherePosFSIZE = vertexPosTypedArray.BYTES_PER_ELEMENT;    					// định nghĩa kích thước cho mỗi phần tử
    
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, spherePosFSIZE * 5, 0);	// thiết lập thông số cho biến 
    gl.enableVertexAttribArray(a_Position);											// cho phép sử dụng biến
  
    var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');				// Nhận vị trí lưu trữ của a_TexCoord
    // thiết lập thông số cho biến a_TexCoord
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, spherePosFSIZE * 5, spherePosFSIZE * 3);	
    gl.enableVertexAttribArray(a_TexCoord); 										// Cho phép sử dụng biến 
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);							// gán vào 1 target
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesTypedArray, gl.STATIC_DRAW);  // bộ đệm lưu trữ
   }

   var u_Sampler;																	// biến để dán ảnh lên khối cầu
   function initTextures(gl, n) {
    var texture = gl.createTexture();   											// Tạo một đối tượng kết cấu
    var texture2 = gl.createTexture();   											// Tạo một đối tượng kết cấu
    u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');						// Nhận vị trí lưu trữ của u_Sampler

    var earthImage = new Image();  													// Tạo một đối tượng image
    var moonImage = new Image();   
    earthImage.onload = function(){ 									    
        loadTexture(gl, n, texture, u_Sampler, earthImage, 0);						// Tải ảnh lên     
    };
    moonImage.onload = function(){     
        loadTexture(gl, n, texture2, u_Sampler, moonImage, 1);     
    };
    earthImage.src = 'earth.jpg';													 // Yêu cầu trình duyệt tải hình ảnh
    moonImage.src = 'moon.jpg';    
    return true;
  }

  function loadTexture(gl, n, texture, u_Sampler, image, texUnit) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Đảo trục y
    // Kích hoạt đơn vị kết cấu 0
    if(texUnit == 0)
    {
      gl.activeTexture(gl.TEXTURE0);
    }else if(texUnit == 1)
    {
      gl.activeTexture(gl.TEXTURE1);
    }else
    {
      console.log('Failed to activeTexture');
      return false;
    }   
    gl.bindTexture(gl.TEXTURE_2D, texture);											// kich hoạt đối tượng kết cấu
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);				// Thiết lập tham số các biến kết cấu
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); 	// Thiết lập hình ảnh kết cấu												// ?
gl.uniform1i(u_Sampler,0);   // truyen don vi ket cau toi fragment
  }
  
const PI = 3.141592654;
var g_isDragging = false;

var a =  PI / 180;
var b = 0.6*PI;

var D=1.5;
var x_origin = 0.0, b_origin = 0.0, y_origin = 0.0, a_origin = 0.0;
function mouseDrag(ev, canvas) {													// hàm di chuột
  var x = ev.clientX;																// Tọa độ x của con trỏ chuột
  var y = ev.clientY;																// Tọa độ y của con trỏ chuột
  var rect = ev.target.getBoundingClientRect(ev, canvas);							// Nhận vị trí của canvas trong vùng con trỏ
  x = ((x - rect.left) - (canvas.height / 2)) / (canvas.height / 2);				// biến đổi vị trí canvas sang webgl
  y = ((canvas.width / 2) - (y - rect.top)) / (canvas.width / 2);
  switch (ev.type) {
    case 'mousedown':
      g_isDragging = true;
      x_origin = x;
      b_origin = b;
      y_origin = y;
      a_origin = a;
      break;
    case 'mouseup':
      g_isDragging = false;
      break;
    case 'mousemove':
      if (g_isDragging == true) {
        a = a_origin + (y - y_origin) * -1.0;
        b = b_origin - (x - x_origin) * -1.0;
        standardize();
      }
      break;
    case 'wheel':
      if (ev.wheelDelta < 0)
        D += 1.5;
      else
        D = ((D - 1.5) > 0) ? (D - 1.5) : 1;
      break;
    default:
      console.log('in mouseDrag(): Unknown mouse event');
  } 
}

   function keydown(ev) {
    switch (ev.keyCode) {
      case 39: // phải
        ANGLE_STEP += 0.02 ;
        break;
      case 37: // trái
        ANGLE_STEP -= 0.02 ;
        break;		
		case 40: //xuong
        big += zoom;
        break;	
		case 38: // len
        big -= zoom;
        break;		
      default: return; 
    }
  }