/*
 * Handling multiple layers for selective visualization
 * Inspired from "three/examples/webgl_layers.html"
 */

import * as THREE from '../../assets/js/three/build/three.module.js';
import  TWEEN  from '../../assets/js/Tween.js';
import { OrbitControls } from '../../assets/js/three/examples/jsm/controls/OrbitControls.js';
import Stats from '../../assets/js/three/examples/jsm/libs/stats.module.js';
import { GUI } from '../../assets/js/three/examples/jsm/libs/dat.gui.module.js';
import {PLYLoader} from '../../assets/js/three/examples/jsm/loaders/PLYLoader.js';
var camera, controls, scene, renderer;
var time = 0;
var step = 1;
var firstAnimation = false;
var groupImages, voxelizedMesh=new THREE.Mesh(), mesh=new THREE.Mesh();
var voxelizedFaces = [];


document.body.onkeyup  = function (event) {
    if (event.keyCode == 32) {
        firstAnimation = true;
    }
};

function imageGroup() {
    var nbImages = 24;
    groupImages = new THREE.Group();
    for (let i = 1; i < nbImages-1; i++) {
        let path = "./assets/images/L_200_1_v2_reduced_" + (nbImages-i) + ".png";
        var img = new THREE.MeshBasicMaterial({ //CHANGED to MeshBasicMaterial
            map: (new THREE.TextureLoader()).load(path)
        });

        img.map.magFilter = THREE.NearestFilter;
        img.map.minFilter = THREE.NearestFilter;
        img.map.needsUpdate = true; //ADDED

        // plane
        var geoPlane = new THREE.PlaneGeometry(22, 27);
        var imgPlane = new THREE.Mesh(geoPlane,img);
        imgPlane.position.z = (i-1) * 2 + 0.1;
        imgPlane.overdraw = true;
        groupImages.add(imgPlane);
    }
    camera.position.z = imgPlane.position.z*2;
}

function imageAnimation() {
    // if (Math.floor(time) - Math.floor(time-step) == 1) {
    //     var index = Math.round(time);
    //     var length = groupImages.children.length;
    //     groupImages.remove(groupImages.children[length-1]);
    //     time += 0.1*time > 0.5 ? 0.5 : 0.1*time;
    // }

    voxelizedMesh.geometry.faces = [];
    for (var face of voxelizedFaces) {
        if (face.z > 30) {
            voxelizedMesh.geometry.faces.push(face);
        }
    }
    voxelizedMesh.geometry.elementsNeedUpdate = true;

    new TWEEN.Tween( voxelizedMesh.material ).to( { opacity: 0 }, 10000 ).start();
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

    imageGroup();
    //scene.add(groupImages);


    var promiseVoxel = loadModel(voxelizedMesh, "./assets/models/180_voxelized.ply");
    var promiseMesh = loadModel(mesh, "./assets/models/180_1_11_1_PR_test_test042019.ply");

    Promise.all([promiseVoxel, promiseMesh]).then(result => {
        // console.log(voxelizedMesh.geometry);
        // var faceIndices = voxelizedMesh.geometry.index.array;
        // var vertices = voxelizedMesh.geometry.attributes.position.array;
        // var geometry = new THREE.Geometry();
        // geometry.vertices = vertices.slice();
        // geometry.faces = faceIndices.slice();
        // geometry.elementsNeedUpdate = true;
        // console.log(geometry);
        // voxelizedMesh.geometry = geometry;

        // for (let i = 0; i < faceIndices.length; i+=3) {
        //     voxelizedFaces.push(new THREE.Face3(faceIndices[i],faceIndices[i+1], faceIndices[i+2]));
        // }
        // console.log(voxelizedFaces[0]);


        scaleModel(mesh, groupImages);
        scaleModel(voxelizedMesh, groupImages);

        mesh.rotation.z = 3*Math.PI/2-0.2;
        voxelizedMesh.rotation.z = Math.PI/2-0.2;

        translateModel(mesh);
        translateModel(voxelizedMesh);
        //scene.add( mesh );
        scene.add( voxelizedMesh );

        var box = new THREE.Box3();
        box.setFromObject(groupImages);
        var min = box.min;
        var max = box.max;

        //Camera
        camera.up = new THREE.Vector3(0,0,1);

        //Controls
        controls = new OrbitControls( camera, renderer.domElement );
        //        camera.lookAt();


        // Light
        var light = new THREE.HemisphereLight( 0x443333, 0x111122 );
        light.layers.enable(0);
        light.layers.enable(1);
        light.layers.enable(2);
        scene.add( light );
	    addShadowedLight( min.x-10 , min.y-10, max.z-20, 0xffffff, 1.8 );
	    addShadowedLight( min.x-10, max.y+10, max.z+30, 0x777777, 1 );

        renderer.gammaInput = true;
	    renderer.gammaOutput = true;
        renderer.shadowMap.enabled = true;
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
        loader.load( filename, resolve );
    });
    return p1.then(geometry => {
        geometry.computeVertexNormals();
        geometry.center();
		var material = new THREE.MeshStandardMaterial( { color: 0xbb7722, transparent: true, opacity: 0.8},  );
        model.geometry = geometry;
        model.material = material;
		model.castShadow = true;
		model.receiveShadow = true;
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
    console.log(camera.position);
}

function animate(t) {
    if (firstAnimation) {
        imageAnimation();
        firstAnimation = false;
    }
	window.requestAnimationFrame( animate );
	render();
    time += step;
    TWEEN.update(t);
}

function render() {
	renderer.render( scene, camera );
}


init();
animate();
