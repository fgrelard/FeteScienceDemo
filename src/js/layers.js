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

init();
animate();

function init() {
    // Init scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xcccccc );
	scene.fog = new THREE.FogExp2( 0xcccccc, 0.01 );

    // Renderer = HTML canvas
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

    // Camera position, adding layers
	camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 100 );
	camera.position.set( 3, 0.15, 30 );
    camera.layers.enable( 0 ); // enabled by default
	camera.layers.enable( 1 );
	camera.layers.enable( 2 );

    // Ground
	var plane = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 4000, 4000 ),
		new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } )
	);
	plane.rotation.x = - Math.PI / 2;
	plane.position.y = - 3.1;
	scene.add( plane );

	plane.receiveShadow = true;

	// controls

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;

	controls.screenSpacePanning = false;


    var loader = new PLYLoader();

    loader.load( './assets/models/180_1_11_1_PR_test_test042019.ply', function ( geometry ) {
        geometry.computeVertexNormals();
        geometry.center();
		var material = new THREE.MeshStandardMaterial( { color: 0xbb7722, transparent: true, opacity: 0.8},  );
		var mesh = new THREE.Mesh( geometry, material );
        var box = new THREE.Box3().setFromObject( mesh );
        mesh.rotation.x = -Math.PI/2;
        mesh.rotation.z = Math.PI;
        box.center( mesh.position ); // this re-sets the mesh position
        mesh.position.multiplyScalar( - 1 );


		mesh.castShadow = true;
		mesh.receiveShadow = true;
        mesh.layers.set(1);
		scene.add( mesh );
	});

    //Embryo
    var geometry = new THREE.SphereGeometry(0.7, 64, 64.);
	var material = new THREE.MeshPhongMaterial( { color: 0xffffff } );
    var sphere = new THREE.Mesh( geometry, material );
    sphere.position.set(0,2,0);
    sphere.layers.set(2);
    sphere.castShadow = true;
    scene.add(sphere);


    // Light
    var light = new THREE.HemisphereLight( 0x443333, 0x111122 );
    light.layers.enable(0);
    light.layers.enable(1);
    light.layers.enable(2);
    scene.add( light );
	addShadowedLight( 1, 1, 1, 0xffffff, 1.35 );
	addShadowedLight( 0.5, 1, - 1, 0x777777, 1 );

    var layers = { pericarp: true, embryo: true };
    renderer.gammaInput = true;
	renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;

	// Init gui : menu to select and deselect layers
	var gui = new GUI();
	gui.add( layers, 'pericarp' ).onChange( function () {

		camera.layers.toggle( 1 );

	} );
	gui.add( layers, 'embryo' ).onChange( function () {

		camera.layers.toggle( 2 );

	} );

	window.addEventListener( 'resize', onWindowResize, false );
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
}

function animate() {
	requestAnimationFrame( animate );
	controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
	render();

}

function render() {
	renderer.render( scene, camera );
}
