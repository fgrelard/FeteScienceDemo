/*
 * Handling multiple layers for selective visualization
 * Inspired from "three/examples/webgl_layers.html"
 */

import * as THREE from '../../assets/js/three/build/three';

import Stats from '../../assets/js/three/examples/jsm/libs/stats.module.js';
import { GUI } from '../../assets/js/three/examples/jsm/libs/dat.gui.module.js';

import {OBJLoader} from '../../assets/js/three/examples/jsm/loaders/OBJLoader.js';

var container, stats;
var camera, scene, renderer;

var radius = 100, theta = 0;

init();
animate();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.layers.enable( 0 ); // enabled by default
	camera.layers.enable( 1 );
	camera.layers.enable( 2 );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	var light = new THREE.PointLight( 0xffffff, 1 );
	light.layers.enable( 0 );
	light.layers.enable( 1 );
	light.layers.enable( 2 );

	scene.add( camera );
	camera.add( light );

	var colors = [ 0xff0000, 0x00ff00, 0x0000ff ];
	var geometry = new THREE.BoxBufferGeometry( 20, 20, 20 );
    var loader = new THREE.OBJLoader();
    loader.load( 'https://threejs.org/examples/models/obj/walt/WaltHead.obj', function ( obj ) {

  	    for ( var i = 0; i < 100; i ++ ) {

    	    var layer = ( i % 3 );

    	    var object = obj.children[ 0 ].clone();

            object.material = new THREE.MeshLambertMaterial( { color: colors[ layer ] } );

            object.position.x = Math.random() * 800 - 400;
            object.position.y = Math.random() * 800 - 400;
            object.position.z = Math.random() * 800 - 400;

            object.rotation.x = Math.random() * 2 * Math.PI;
            object.rotation.y = Math.random() * 2 * Math.PI;
            object.rotation.z = Math.random() * 2 * Math.PI;

            object.scale.x = Math.random() + 0.5;
            object.scale.y = Math.random() + 0.5;
            object.scale.z = Math.random() + 0.5;

            object.layers.set( layer );

            scene.add( object );

        }

    } );
	var layer;

	// for ( var i = 0; i < 300; i ++ ) {

	// 	layer = ( i % 3 );

	// 	var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: colors[ layer ] } ) );

	// 	object.position.x = Math.random() * 800 - 400;
	// 	object.position.y = Math.random() * 800 - 400;
	// 	object.position.z = Math.random() * 800 - 400;

	// 	object.rotation.x = Math.random() * 2 * Math.PI;
	// 	object.rotation.y = Math.random() * 2 * Math.PI;
	// 	object.rotation.z = Math.random() * 2 * Math.PI;

	// 	object.scale.x = Math.random() + 0.5;
	// 	object.scale.y = Math.random() + 0.5;
	// 	object.scale.z = Math.random() + 0.5;

	// 	object.layers.set( layer );

	// 	scene.add( object );

	// }

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	stats = new Stats();
	container.appendChild( stats.dom );

	var layers = { red: true, green: true, blue: true };

	//
	// Init gui
	var gui = new GUI();
	gui.add( layers, 'red' ).onChange( function () {

		camera.layers.toggle( 0 );

	} );
	gui.add( layers, 'green' ).onChange( function () {

		camera.layers.toggle( 1 );

	} );
	gui.add( layers, 'blue' ).onChange( function () {

		camera.layers.toggle( 2 );

	} );

	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {
	requestAnimationFrame( animate );
	render();
	stats.update();

}

function render() {
	theta += 0.1;

	camera.position.x = radius * Math.sin( THREE.Math.degToRad( theta ) );
	camera.position.y = radius * Math.sin( THREE.Math.degToRad( theta ) );
	camera.position.z = radius * Math.cos( THREE.Math.degToRad( theta ) );
	camera.lookAt( scene.position );

	renderer.render( scene, camera );

}
