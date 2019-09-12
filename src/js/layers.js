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
var parts = ["BundleLeft", "BundleRight", "Embryo", "InnerRegion", "OuterGrain"];
var legend = ["Faisceau gauche", "Faisceau droit", "Embryon", "Région interne", "Région externe"];
var colors = ["#99cc99", "#99cc99", "#dddddd", "#bb9977",  "#bb7722"];
var meshes = [];

init();
animate();

function init() {
    // Init scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xcccccc );
	scene.fog = new THREE.FogExp2( 0xcccccc, 0.0001 );

    // Renderer = HTML canvas
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

    // Camera position, adding layers
	camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 0, 500, 2000 );

    // Ground
	var plane = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 40000, 40000 ),
		new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } )
	);
	plane.rotation.x = - Math.PI / 2;
	plane.position.y = - 3.1;
	scene.add( plane );

	plane.receiveShadow = true;

	// controls

	controls = new OrbitControls( camera, renderer.domElement );

    var promises = [];
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        let mesh = new THREE.Mesh();
        let promise = loadModel(mesh, "./assets/models/parts/180_1_11_1_subZ20_"+ part +".ply", i);
        promises.push(promise);
    }

    Promise.all(promises).then(result => {
        for (let mesh of result) {
            mesh.rotation.x = -Math.PI/2;
            meshes.push(mesh);
            scene.add(mesh);
        }
        var lastPart = meshes[meshes.length-1];
        var box = new THREE.Box3();
        box.setFromObject(lastPart);
        var boxSize = box.getSize();
        camera.position.y = boxSize.y;
        camera.position.z = 4000;
        for (let mesh of meshes) {
            mesh.position.y = boxSize.y / 2;
        }
    });




    // Light
    var light = new THREE.HemisphereLight( 0x443333, 0x111122 );

    //Enable layers
    for (var i = 0; i < legend.length+1; i++) {
        camera.layers.enable( i );
        light.layers.enable(i);
        plane.layers.set(i);
    }

    scene.add( light );
	addShadowedLight( 1, 1, 1, 0xffffff, 1.35 );
	addShadowedLight( 0.5, 1, - 1, 0x777777, 1 );

    var layers = {};
    for (let leg of legend) {
        layers[leg] = true;
    }

    renderer.gammaInput = true;
	renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;

	// Init gui : menu to select and deselect layers
	var gui = new GUI();
    for (let i = 0; i < legend.length; i++) {
        gui.add(layers, legend[i]).onChange( function(event) {
            camera.layers.toggle(i);
        });
    }

	window.addEventListener( 'resize', onWindowResize, false );
}

function translateModel(model) {
    var box = new THREE.Box3();
    box.setFromObject( model );
    var boundingSize = box.getSize();
    var z = boundingSize.z;
    model.position.z = z/2;
}

function loadModel(model, filename, i) {
    var loader = new PLYLoader();
    var p1 =  new Promise(resolve => {
        loader.load( filename, resolve);
    });
    return p1.then(geometry => {
        geometry.computeVertexNormals();
        geometry.center();
		var material = new THREE.MeshStandardMaterial( { color: colors[i], transparent: true, opacity: 0.6, side: THREE.DoubleSide},  );
        model.geometry = geometry;
        model.material = material;
		model.castShadow = true;
		model.receiveShadow = true;
        model.layers.set(i);

        return model;
    });
}


function addShadowedLight( x, y, z, color, intensity ) {
	var directionalLight = new THREE.DirectionalLight( color, intensity );
    for (var i  = 0; i < legend.length+1; i++) {
        directionalLight.layers.enable(i);
    }
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
