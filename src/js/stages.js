/*
 * Animation highlighting the image processing workflow
 * Press space-bar to start
 */

import * as THREE from '../../assets/js/three/build/three.module.js';
import  TWEEN  from '../../assets/js/Tween.js';
import { OrbitControls } from '../../assets/js/three/examples/jsm/controls/OrbitControls.js';
import Stats from '../../assets/js/three/examples/jsm/libs/stats.module.js';
import { GUI } from '../../assets/js/three/examples/jsm/libs/dat.gui.module.js';
import {PLYLoader} from '../../assets/js/three/examples/jsm/loaders/PLYLoader.js';
import { EffectComposer } from '../../assets/js/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../assets/js/three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../../assets/js/three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from '../../assets/js/three/examples/jsm/postprocessing/OutlinePass.js';
import { FXAAShader } from '../../assets/js/three/examples/jsm/shaders/FXAAShader.js';

const stages = [60, 120, 180, 240, 270, 310];

var camera, controls, scene, renderer;
var animation = false;
var meshes = [];
var composer;


document.body.onkeyup  = function (event) {
    //Press space bar
    if (event.keyCode == 32) {
        animation = true;
    }
};

function matchRuleShort(str, rule) {
  var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
}


function init() {
    // Init scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xcccccc );
	//scene.fog = new THREE.FogExp2( 0xcccccc, 0.001 );

    // Renderer = HTML canvas
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );


    // Camera position
	camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 100000 );
	camera.position.set( 0, 0, 300 );

    composer = new EffectComposer( renderer );
	var renderPass = new RenderPass( scene, camera );
	composer.addPass( renderPass );
	var outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    outlinePass.edgeStrength = 4;
    outlinePass.edgeThickness = 7;
    outlinePass.edgeGlow = 1;
    outlinePass.pulsePeriod = 1;
    outlinePass.visibleEdgeColor.set( "#0033cc" );
	composer.addPass( outlinePass );
	var onLoad = function ( texture ) {
		outlinePass.patternTexture = texture;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
	};

	var effectFXAA = new ShaderPass( FXAAShader );
	effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	composer.addPass( effectFXAA );

    renderer.gammaInput = true;
	renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;


    // Ground
	var plane = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 4000, 4000 ),
		new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } )
	);
    plane.position.set(0,0,0);
    plane.receiveShadow = true;
	scene.add( plane );

    //Grain models

    var promises = [];
    for (let stage of stages) {
        let mesh = new THREE.Mesh();
        var promise = loadModel(mesh, "./assets/models/" + stage + "_1_11_1_seg_sub05_align.ply");
        promises.push(promise);
    }

    Promise.all(promises).then(result => {
        for (let mesh of result) {
            mesh.rotation.z = 3*Math.PI/2-0.2;
            translateModel(mesh);

            meshes.push(mesh);
            scene.add(mesh);
            var box = new THREE.Box3();
            box.setFromObject(mesh);
            var min = box.min;
            var max = box.max;
        }

        //Camera
        camera.up = new THREE.Vector3(0,0,1);

        //Controls
        controls = new OrbitControls( camera, renderer.domElement );
        //camera.lookAt();


        // Light
        var light = new THREE.HemisphereLight( 0x443333, 0x111122 );
        // scene.add( light );
	    addShadowedLight( max.x+30 , min.y-10, max.z-20, 0xffffff, 1.8 );
	    addShadowedLight( min.x-30, max.y+40, max.z+50, 0x777777, 1 );


    });



	window.addEventListener( 'resize', onWindowResize, false );
}



function scaleModel(model, reference) {
    var box = new THREE.Box3();
    box.setFromObject( reference );
    var referenceRadius = box.getSize();
    var modelRadius = model.geometry.boundingBox.getSize();
    var r = referenceRadius.z / modelRadius.z;
    model.scale.set(r, r, r);
}

function translateModel(model) {
    var box = new THREE.Box3();
    box.setFromObject( model );
    var boundingSize = box.getSize();
    var z = boundingSize.z;
    model.position.z = z/2;
}

function loadModel(model, filename) {
    var loader = new PLYLoader();
    var p1 =  new Promise(resolve => {
        loader.load( filename, resolve);
    });
    return p1.then(geometry => {
        geometry.computeVertexNormals();
        geometry.center();
		var material = new THREE.MeshStandardMaterial( { color: 0xbb7722, transparent: true, opacity: 0.8},  );
        model.geometry = geometry;
        model.material = material;
		model.castShadow = true;
		model.receiveShadow = true;
        return model;
    });
}

function addShadowedLight( x, y, z, color, intensity ) {
	var directionalLight = new THREE.DirectionalLight( color, intensity );
	directionalLight.position.set( x, y, z );
	scene.add( directionalLight );
	directionalLight.castShadow = true;
	var d = 100;
	directionalLight.shadow.camera.left = - d;
	directionalLight.shadow.camera.right = d;
	directionalLight.shadow.camera.top = d;
	directionalLight.shadow.camera.bottom = - d;
	directionalLight.shadow.camera.near = 0.01;
	directionalLight.shadow.camera.far = 300;
	directionalLight.shadow.mapSize.width = 1024;
	directionalLight.shadow.mapSize.height = 1024;
	directionalLight.shadow.bias = - 0.001;
}


function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate(t) {
    window.requestAnimationFrame( animate );
    render();
    composer.render();
    if (animation) {

    }
    TWEEN.update(t);
}

function render() {
	renderer.render( scene, camera );
}


init();
animate();
