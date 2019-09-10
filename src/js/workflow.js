/*
 * Handling multiple layers for selective visualization
 * Inspired from "three/examples/webgl_layers.html"
 */

import * as THREE from '../../assets/js/three/build/three.module.js';
import { OrbitControls } from '../../assets/js/three/examples/jsm/controls/OrbitControls.js';
import Stats from '../../assets/js/three/examples/jsm/libs/stats.module.js';
import { GUI } from '../../assets/js/three/examples/jsm/libs/dat.gui.module.js';
import {PLYLoader} from '../../assets/js/three/examples/jsm/loaders/PLYLoader.js';
var camera, controls, scene, renderer;
var time = 0;
var step = 0.01;
var firstAnimation = false;
var groupImages;



document.body.onkeyup  = function (event) {
    if (event.keyCode == 32) {
        firstAnimation = true;
    }
};

function imageGroup() {
    var nbImages = 24;
    groupImages = new THREE.Group();
    for (let i = 1; i < nbImages; i++) {
        let path = "./assets/images/L_200_1_v2_reduced_" + i + ".png";
        var img = new THREE.MeshBasicMaterial({ //CHANGED to MeshBasicMaterial
            map: (new THREE.TextureLoader()).load(path)
        });
        img.map.needsUpdate = true; //ADDED

        // plane
        var geoPlane = new THREE.PlaneGeometry(22, 27);
        var imgPlane = new THREE.Mesh(geoPlane,img);
        imgPlane.position.z = (i-1) * 2 + 1;
        imgPlane.overdraw = true;
        groupImages.add(imgPlane);
    }
    camera.position.z = imgPlane.position.z*2;
}

function imageAnimation() {
    if (Math.floor(time) - Math.floor(time-step) == 1) {
        var index = Math.round(time);
        var length = groupImages.children.length;
        groupImages.remove(groupImages.children[length-1]);
        time += 0.1*time > 0.5 ? 0.5 : 0.1*time;
    }
}

function init() {
    // Init scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xcccccc );
	scene.fog = new THREE.FogExp2( 0xcccccc, 0.001 );

    // Renderer = HTML canvas
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

    // Camera position, adding layers
	camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 0, 0, 300 );
    camera.layers.enable( 0 ); // enabled by default
	camera.layers.enable( 1 );
	camera.layers.enable( 2 );


    // Ground
	var plane = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 4000, 4000 ),
		new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } )
	);
    plane.position.set(0,0,0);

	scene.add( plane );

	plane.receiveShadow = true;

	// controls
    controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;
	controls.screenSpacePanning = true;


    // Light
    var light = new THREE.HemisphereLight( 0x443333, 0x111122 );
    light.layers.enable(0);
    light.layers.enable(1);
    light.layers.enable(2);
    scene.add( light );
	addShadowedLight( 1, 1, 1, 0xffffff, 1.35 );
	addShadowedLight( 0.5, -1, 1, 0x777777, 1 );

    var layers = { pericarp: true, embryo: true };
    renderer.gammaInput = true;
	renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;

	// Init gui : menu to select and deselect layers
	var gui = new GUI();
	gui.add( layers, 'pericarp' ).onChange( function () {

		camera.layers.toggle( 1 );

	} );

    imageGroup();
    scene.add(groupImages);
    camera.lookAt(groupImages.position);
    addModel();

	window.addEventListener( 'resize', onWindowResize, false );
}

function addModel() {
    var loader = new PLYLoader();

    loader.load( "./assets/models/180_1_11_1_PR_test_test042019.ply", function ( geometry ) {
        geometry.computeVertexNormals();
        geometry.center();
		var material = new THREE.MeshStandardMaterial( { color: 0xbb7722, transparent: true, opacity: 0.8},  );
		var mesh = new THREE.Mesh( geometry, material );
        var box = new THREE.Box3().setFromObject( mesh );
		mesh.castShadow = true;
		mesh.receiveShadow = true;
        mesh.layers.set(1);
		scene.add( mesh );
	});

}

function addShadowedLight( x, y, z, color, intensity ) {
	var directionalLight = new THREE.DirectionalLight( color, intensity );
    directionalLight.layers.enable(0);
    directionalLight.layers.enable(1);
    directionalLight.layers.enable(2);
	directionalLight.position.set( x, y, z );
	scene.add( directionalLight );
	directionalLight.castShadow = true;
	var d = 10;
	directionalLight.shadow.camera.left = - d;
	directionalLight.shadow.camera.right = d;
	directionalLight.shadow.camera.top = d;
	directionalLight.shadow.camera.bottom = - d;
	directionalLight.shadow.camera.near = 0.01;
	directionalLight.shadow.camera.far = 30;
	directionalLight.shadow.mapSize.width = 1024;
	directionalLight.shadow.mapSize.height = 1024;
	directionalLight.shadow.bias = - 0.001;
}


function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
    console.log(camera.position);
}

function animate() {
    if (firstAnimation) {
        imageAnimation();
    }
	requestAnimationFrame( animate );
	controls.update();
	render();
    time += step;

}

function render() {
	renderer.render( scene, camera );
}


init();
animate();
