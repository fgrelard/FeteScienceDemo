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
import { Line2 } from '../../assets/js/three/examples/jsm/lines/Line2.js';
import { LineMaterial } from '../../assets/js/three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from '../../assets/js/three/examples/jsm/lines/LineGeometry.js';

var camera, controls, scene, renderer;
var animation = false;

var groupImages, voxelizedMesh=new THREE.Mesh(), mesh=new THREE.Mesh(), curvature = new THREE.Mesh();

var previousPlanePosition = 0;

//Arrays containing faces of models
var voxelizedFaces = [], faces = [];

//Outline of sweeping planes
var sweepingPlane, sweepingPlane2;
var composer;
var outlinePass;

/**
 * Event raised when "SPACE-BAR" is pressed
 * @param {} event
 */
document.body.onkeyup = function (event) {
    //Press space bar
    if (event.keyCode == 32) {
        animation = true;
    }
};


/**
 * Image stack
 * Loading planes with images as texture
 */
function imageGroup() {
    var nbImages = 24;
    groupImages = new THREE.Group();
    for (let i = 1; i < nbImages-1; i++) {
        let path = "./assets/images/L_200_1_v2_reduced_" + i + ".png";
        var img = new THREE.MeshBasicMaterial({ //CHANGED to MeshBasicMaterial
            map: (new THREE.TextureLoader()).load(path),
            transparent: true,
            side: THREE.DoubleSide
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

/**
 * Segmentation animation
 * Image stack disappears, segmentation appears
 */
function imageAnimation() {
    document.getElementById("step").textContent = "Segmentation du grain";

    //Reset position
    sweepingPlane.position.set(0,0,49);
    sweepingPlane.visible = true;
    voxelizedMesh.visible = true;

    voxelizedMesh.geometry.faces.length = 1;
    voxelizedMesh.updateMatrix();

    var scaling = new THREE.Vector3(), rot = new THREE.Quaternion(), pos = new THREE.Vector3();
    voxelizedMesh.matrix.decompose(pos, rot, scaling);
    var vertices = voxelizedMesh.geometry.vertices.slice();

    previousPlanePosition = sweepingPlane.position.z;

    new TWEEN.Tween( sweepingPlane.position ).to( {z : -0.1} , 10000).delay(1500).onUpdate(() => {

        if (Math.abs(Math.floor(sweepingPlane.position.z) - Math.floor(previousPlanePosition)) >= 2)  {
            //Remove image stack
            for (var child of groupImages.children) {
                if (child.position.z > sweepingPlane.position.z) {
                    child.visible = false;
                }
            }

            //Reveal mesh
            var tz = voxelizedMesh.position.z;
            for (var i = voxelizedMesh.geometry.faces.length; i < voxelizedFaces.length; i++) {
                var face = voxelizedFaces[i];
                var v = vertices[face.c];
                if (v.z * scaling.z + pos.z > sweepingPlane.position.z) {
                    voxelizedMesh.geometry.faces.push(face);
                }
            }
            voxelizedMesh.material.opacity = 0.8;
            voxelizedMesh.geometry.elementsNeedUpdate = true;
            previousPlanePosition = sweepingPlane.position.z;
        }
    }).onComplete(() => {
        sweepingPlane.visible = false;
    }).start();
}

/**
 * Mesh extraction animation
 * Segmentation disappears, mesh appears
 */
function meshAnimation() {
    document.getElementById("step").textContent = "Extraction du maillage";

    //Reset
    sweepingPlane2.position.set(0, -30, 0);
    translateModel(sweepingPlane2);
    sweepingPlane2.visible = true;
    mesh.visible = true;
    mesh.opacity = 0;

    mesh.geometry.faces.length = 1;
    mesh.updateMatrix();
    voxelizedMesh.updateMatrix();

    var verticesV = voxelizedMesh.geometry.vertices.slice();
    var vertices = mesh.geometry.vertices.slice();

    previousPlanePosition = sweepingPlane2.position.y;

    var box = new THREE.Box3();
    box.setFromObject(mesh);

    new TWEEN.Tween( sweepingPlane2.position ).to( {y : 40} , 10000).delay(1500).onUpdate(() => {

        if (Math.abs(Math.floor(sweepingPlane2.position.y) - Math.floor(previousPlanePosition)) >= 2 && sweepingPlane2.position.y < box.max.y+5)  {

            //Remove voxelized mesh
            voxelizedMesh.geometry.faces.length = 1;
            for (let i = 0; i < voxelizedFaces.length; i++) {
                let face = voxelizedFaces[i];
                let v = verticesV[face.c].clone();
                v.applyMatrix4(voxelizedMesh.matrix);
                if (v.y > sweepingPlane2.position.y) {
                    voxelizedMesh.geometry.faces.push(face);
                }
            }

            //Reveal mesh
            for (let i = 0; i < faces.length; i++) {
                let face = faces[i];
                let v = vertices[face.c].clone();
                v.applyMatrix4(mesh.matrix);
                if (v.y < sweepingPlane2.position.y) {
                    mesh.geometry.faces.push(face);
                }
            }
            voxelizedMesh.material.opacity = 0.8;
            mesh.material.opacity = 0.8;
            voxelizedMesh.geometry.elementsNeedUpdate = true;
            mesh.geometry.elementsNeedUpdate = true;
            previousPlanePosition = sweepingPlane2.position.y;
        }
    }).onComplete(() => {
        sweepingPlane2.visible = false;
        voxelizedMesh.visible = false;
    }).start();
}

/**
 * Function allowing to create thicker arrows
 * Uses arrow helper to init matrices
 * And fits cylinders instead of lines
 * @param {THREE.Vector3} dir
 * @param {THREE.Vector3} origin
 * @param {Number} length
 * @param {hex} color
 * @param {Number} width width of arrow
 * @returns {THREE.Group} the arrow : 2 cones + 1 cylinder
 */
function createArrow(dir, origin, length, color, width) {

    var arrowHelper = new THREE.ArrowHelper( dir.clone().normalize(), origin, length/2, color, 0.1*length/2 );
    var arrowHelper2 = new THREE.ArrowHelper( dir.clone().negate().normalize(), origin, length/2, color, 0.1*length/2);

    arrowHelper.updateMatrix();
    arrowHelper2.updateMatrix();

    //Larger arrow
    var material =  new THREE.MeshBasicMaterial({color:color, transparent: true, opacity:0, depthWrite:false});
	var line = new THREE.Mesh(new THREE.CylinderGeometry(width,width, length-0.1*length, 32), material);
    line.applyMatrix(arrowHelper.matrix.clone());

    var head1 = new THREE.Mesh(new THREE.ConeGeometry( width*10, width*10, 32 ), material);
    var head2 = head1.clone();

    arrowHelper.cone.updateMatrix();
    head1.applyMatrix(arrowHelper.cone.matrix.clone());
    head1.applyMatrix(arrowHelper.matrix.clone());

    arrowHelper2.cone.updateMatrix();
    head2.applyMatrix(arrowHelper2.cone.matrix.clone());
    head2.applyMatrix(arrowHelper2.matrix.clone());
    var group = new THREE.Group();
    group.add(line, head1, head2);
    group.material = material;
    return group;
}

/**
 * Morphometry animation
 * 1 - Length from bounding box with arrows
 * appearing inside the mesh
 * 2 - Curvature values appearing
 */
function measurementAnimation() {
    document.getElementById("step").textContent = "Mesures : dimensions du grain";

    //Reset
    curvature.material.opacity = 0;

    //Necessary to see arrows inside the mesh
    mesh.material.depthWrite = false;
    curvature.material.depthWrite = false;

     new TWEEN.Tween(mesh.material).to({opacity:0.3}, 2000).onUpdate(()=> {
     }).onComplete(()=>{
         var box = new THREE.Box3();
         box.setFromObject(mesh);
         var origin = box.getCenter().clone();
         var size = box.getSize();
         var width = 0.2;
         var arrowX = createArrow(new THREE.Vector3(1, 0, 0), origin, size.x, 0x2222cc, width);
         var arrowY = createArrow(new THREE.Vector3(0, 1, 0), origin, size.y, 0x22cc22, width);
         var arrowZ = createArrow(new THREE.Vector3(0, 0, 1), origin, size.z, 0xcc2222, width);
         scene.add(arrowX, arrowY, arrowZ);

         //Revealing length measurements one by one
         new TWEEN.Tween(arrowX.material).to({opacity:1.0}, 1000).delay(2000).onComplete(() => {
             new TWEEN.Tween(arrowY.material).to({opacity:1.0}, 1000).delay(500).onComplete(() => {
                 new TWEEN.Tween(arrowZ.material).to({opacity:1.0}, 1000).delay(500).onComplete(() => {
                     new TWEEN.Tween(mesh.material).delay(3000).to({opacity:0.0}, 2000).onUpdate(()=> {

                         //Curvature mesh reveal
                         document.getElementById("step").textContent = "Mesures : courbure";
                         curvature.visible = true;
                         arrowX.visible = false;
                         arrowY.visible = false;
                         arrowZ.visible = false;
                     }).onComplete(()=>{
                         mesh.visible = false;
                     }).start();
                     new TWEEN.Tween(curvature.material).delay(3000).to({opacity:1.0}, 1500).onComplete(()=>{

                         curvature.material.depthWrite = true;
                     }).start();
                 }).start();
             }).start();
         }).start();
    }).start();

}

/**
 * Main function with initialization
 * @returns {}
 */
function init() {
    document.getElementById("step").textContent = "Image 3D (scanner - tomographie)";

    // Init scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xcccccc );
	scene.fog = new THREE.FogExp2( 0xcccccc, 0.001 );

    // Renderer = HTML canvas
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );


    // Camera position
	camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 0, 0, 300 );

    composer = new EffectComposer( renderer );
	var renderPass = new RenderPass( scene, camera );
	composer.addPass( renderPass );

	outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
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

    //Sweeping plane
    sweepingPlane = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 40,40 ),
		new THREE.MeshBasicMaterial( { color: 0x535353,  transparent:true, opacity:0.5 } )
	);
    sweepingPlane.visible = false;

    sweepingPlane2 = sweepingPlane.clone();
    sweepingPlane2.scale.y = 1.3;
    sweepingPlane2.scale.x = 0.9;
    sweepingPlane2.rotation.x = Math.PI/2;


    outlinePass.selectedObjects = [sweepingPlane, sweepingPlane2];
    scene.add(sweepingPlane, sweepingPlane2);

    //Images
    imageGroup();
    scene.add(groupImages);

    //Grain models
    var promiseVoxel = loadModel(voxelizedMesh, "./assets/models/180_voxelized.ply");
    var promiseMesh = loadModel(mesh, "./assets/models/180_1_11_1_PR_test_test042019.ply");
    var promiseCurvature = loadModel(curvature, "./assets/models/180_curvature.ply");

    Promise.all([promiseVoxel, promiseMesh, promiseCurvature]).then(result => {

        extractFaces(voxelizedMesh);
        extractFaces(mesh);

        voxelizedFaces = voxelizedMesh.geometry.faces.slice();
        voxelizedFaces.sort((a,b) => {
            return  voxelizedMesh.geometry.vertices[b.c].z - voxelizedMesh.geometry.vertices[a.c].z;
        });

        faces = mesh.geometry.faces.slice();

        scaleModel(mesh, groupImages);
        scaleModel(voxelizedMesh, groupImages);
        scaleModel(curvature, groupImages);

        mesh.rotation.z = 3*Math.PI/2-0.2;
        voxelizedMesh.rotation.z = Math.PI/2-0.2;
        curvature.rotation.z = Math.PI/2-0.2;

        translateModel(mesh);
        translateModel(voxelizedMesh);
        translateModel(curvature);

        scene.add(mesh, voxelizedMesh, curvature);

        var box = new THREE.Box3();
        box.setFromObject(groupImages);
        var min = box.min;
        var max = box.max;

        //Camera
        camera.up = new THREE.Vector3(0,0,1);

        //Controls
        controls = new OrbitControls( camera, renderer.domElement );

        // Light
        var light = new THREE.HemisphereLight( 0x443333, 0x111122 );
        scene.add( light );
	    addShadowedLight( max.x+10 , min.y-10, max.z-20, 0xffffff, 1.8 );
	    addShadowedLight( min.x-10, max.y+10, max.z+50, 0x777777, 1 );

    });


	window.addEventListener( 'resize', onWindowResize, false );
}

/**
 * Extracting faces from model
 * @param {THREE.Mesh} model
 */
function extractFaces(model) {
    var faceIndices = model.geometry.index.array;
    var geometry = new THREE.Geometry();
    for (let i = 0; i < faceIndices.length; i+=3) {
        geometry.faces.push(new THREE.Face3(faceIndices[i],faceIndices[i+1], faceIndices[i+2]));
    }
    var vertices = model.geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i+=3) {
        geometry.vertices.push(new THREE.Vector3(vertices[i],vertices[i+1], vertices[i+2]));
    }

    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    model.geometry = geometry;
    model.geometryNeedsUpdate = true;
}

/**
 * Scaling the model according to reference bounding box
 * @param {THREE.Mesh} model
 * @param {THREE.Mesh} reference
 */
function scaleModel(model, reference) {
    var box = new THREE.Box3();
    box.setFromObject( reference );
    var referenceRadius = box.getSize();
    var modelRadius = model.geometry.boundingBox.getSize();
    var r = referenceRadius.z / modelRadius.z;
    model.scale.set(r, r, r);
}

/**
 * Translate the model so that it is above
 * the plane z=0
 * @param {THREE.Mesh} model
 */
function translateModel(model) {
    var box = new THREE.Box3();
    box.setFromObject( model );
    var boundingSize = box.getSize();
    var z = boundingSize.z;
    model.position.z = z/2;
}

/**
 * Load ply model
 * @param {THREE.Mesh} model the mesh to load the ply in
 * @param {String} filename
 * @returns {Promise}
 */
function loadModel(model, filename) {
    var loader = new PLYLoader();
    var p1 =  new Promise(resolve => {
        loader.load( filename, resolve);
    });
    return p1.then(geometry => {
        console.log(filename);
        console.log(geometry);
        geometry.computeVertexNormals();
        geometry.center();
		var material = new THREE.MeshStandardMaterial( { color: 0xbb7722,
                                                         transparent: true,
                                                         opacity: 0,
                                                         side : THREE.DoubleSide}  );
        if (filename.includes("curvature")) {
            material.vertexColors = THREE.VertexColors;
        }
        model.geometry = geometry;
        model.material = material;
        //False initially, revealed by animations
        model.visible = false;
		model.castShadow = true;
		model.receiveShadow = true;
    });
}

/**
 * Add light inducing shadows
 * @param {Number} x x position of light
 * @param {Number} y y position of light
 * @param {Number} z z position of light
 * @param {hex} color light color
 * @param {Number} intensity
 */
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


/**
 * Updates parameters when window is resized
 */
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

/**
 * Render loop
 */
function animate(t) {
    window.requestAnimationFrame( animate );
    render();
    composer.render();
    if (animation) {
        if (groupImages.children[0].visible) {
            imageAnimation();
        }
        else if (voxelizedMesh.visible) {
            meshAnimation();
        }
        else if (mesh.visible) {
            measurementAnimation();
        }
        else {
            curvature.visible = false;
            for (let child of groupImages.children) {
                child.visible = true;
            }
            document.getElementById("step").textContent = "Image 3D (scanner - tomographie)";
        }
        animation = false;
    }
    TWEEN.update(t);
}

/**
 * Render
 */
function render() {
	renderer.render( scene, camera );
}


init();
animate();
