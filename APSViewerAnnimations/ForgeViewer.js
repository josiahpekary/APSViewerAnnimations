var oConfig;
var viewer;
var annimationProps;
let tree;
let frags;

//switch commented code to view one of the two test models
var oModelName = "S80_TESTMODEL";
//var oModelName = "SLift_TESTMODEL";

window.onload = () => {
  launchViewer(`TEST3-S100-Forge-Pre-Modeled/${oModelName}/bubble.json`);
  $("#doorSlider").attr("max", oModelName == "S80_TESTMODEL" ? 88 : 180);
};

function launchViewer(bubbleFile) {
  var options = {
    //switch to local in order to view without needing token or back end api
    env: "AutodeskProduction",
    getAccessToken: getForgeToken,
  };
  const config = {};

  Autodesk.Viewing.Initializer(options, () => {
    viewer = new Autodesk.Viewing.Private.GuiViewer3D(
      document.getElementById("forgeViewer"),
      config
    );
    viewer.start();
    viewer.setGhosting(false);
    Autodesk.Viewing.Document.load(
      bubbleFile,
      onDocumentLoadSuccess,
      onDocumentLoadFailure
    );
    //viewer.setGroundReflection(true);
    //viewer.setLightPreset(13);
  });
}

function onDocumentLoadSuccess(doc) {
  //wait for instance tree to load so that it isn't undefined
  viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, () => {
    tree = viewer.model.getInstanceTree();
    frags = viewer.model.getFragmentList();
    //request the annimation properties .txt file and read into a JSON object
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        annimationProps = JSON.parse(this.responseText);
      }
    };

    xmlhttp.open("GET", `${oModelName}/AnnimationProps.txt`, true);
    xmlhttp.send();
  });

  var viewables = doc.getRoot().getDefaultGeometry();
  viewer.loadDocumentNode(doc, viewables, { isAEC: true }).then((i) => {
    //The slider input on screen will give the current "frame" that should be shown.
    //This could instead be a played annimation or anything that can repeatedly call the annimation function
    $("#doorSlider").on("input", function () {
      AnnimateModel($(this).val());
    });
  });

}

function onDocumentLoadFailure(viewerErrorCode) {
  console.error("onDocumentLoadFailure() - errorCode:" + viewerErrorCode);
}

function getForgeToken(callback) {
  fetch("/api/forge/token").then((res) => {
    res.json().then((data) => {
      callback(data.access_token, data.expires_in);
    });
  });
}




//Annimate model to the position and rotation of the current frame
function AnnimateModel(currentPosition) {
  let tree = viewer.model.getData().instanceTree;

  //Loop through the array of annimation objects gotten from the .txt file and set their transformations
  for (const oItem of annimationProps) {
    var positionOrig = new THREE.Vector3();
    var rotationO = new THREE.Quaternion();
    var scaleO = new THREE.Vector3();
    var mO = new THREE.Matrix4();
    //get and decompose the component's original transformation
    mO.elements = JSON.parse(JSON.stringify(oItem.oOriginMatrix));
    mO.transpose().decompose(positionOrig, rotationO, scaleO);

    //units are cm by default for the transformation data from Inventor, but the viewer loads the model in the document units
    //so the translation must go through a unit conversion if the units are different
    positionOrig.multiplyScalar(oModelName == "SLift_TESTMODEL" ? 1 : 1 / 2.54);

    //do the same as above for the current frame's transformation data
    var position = new THREE.Vector3();
    var rotation = new THREE.Quaternion();
    var scale = new THREE.Vector3();
    var m = new THREE.Matrix4();

    m.elements = JSON.parse(JSON.stringify(oItem.oMatricies[currentPosition]));
    m.transpose().decompose(position, rotation, scale);

    position.multiplyScalar(oModelName == "SLift_TESTMODEL" ? 1 : 1 / 2.54);

    //position new is the vector that we will apply to the viewer model
    var positionNew = new THREE.Vector3();
    positionNew = position.clone();
    //the positionOffset vector is the difference between its original position and the position it would be in if only rotated
    //the amount we will set. When we apply a quaternion to the component it will rotate about the center of the assembly, but we only want it to rotate about it'self.
    //So we are calculating the vector that would "undo" the position change that the rotation causes
    var positionOffset = new THREE.Vector3();
    positionOffset = positionOrig.clone();
    positionOffset.applyQuaternion(rotation);
    //positionQuatApplied is collected only for debugging purposes
    positionQuatApplied = positionOffset.clone();
    positionOffset.subVectors(positionOffset, positionOrig);
    //the position we apply will be the position from the transformation data minus the offset position due to the rotation
    positionNew.subVectors(positionNew, positionOffset);

    oItem.NodeNames.forEach((compName) => {

      //these lines are only used for debugging purposes
      //they output specific components locations
      let nodeID = findNodeIdbyName(compName);
      if (compName.includes("Jamb")) {
        //console.log(compName,rotation);
      }
      if (compName.includes("ROD:1")) {
        /* console.log("position", position);
        console.log("positionNew", positionNew);
        console.log("positionOrigin", positionOrig);
        console.log("positionQuatApplied", positionQuatApplied);
        console.log("positionOffset", positionOffset);
        console.log(compName, rotation); */
      }
      //enumerate through the fragment proxies and set its position and rotation
      tree.enumNodeFragments(
        nodeID,
        function (frag) {
          var fragProxy = viewer.impl.getFragmentProxy(viewer.model, frag);

          fragProxy.getAnimTransform();
          fragProxy.position = positionNew;
          fragProxy.quaternion = rotation;
          fragProxy.updateAnimTransform();
        },
        true
      );
    });
  }

  viewer.impl.sceneUpdated(true);
}
//function to find the viewer node by the name (Inventor component name)
function findNodeIdbyName(name) {
  let tree = viewer.model.getData().instanceTree;
  let nodeList = Object.values(tree.nodeAccess.dbIdToIndex);
  for (let i = 0, len = nodeList.length; i < len; ++i) {
    //console.log(tree.getNodeName(nodeList[i]));
    if (tree.getNodeName(nodeList[i]) === name) {
      return nodeList[i];
    }
  }
  return null;
}
