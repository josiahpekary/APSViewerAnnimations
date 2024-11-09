# Export Animations From Autodesk Inventor To The APS Viewer

This project is meant to gather animation data from Inventor (through the component data while driving constraints or parameters), and read that data in the APS viewer for the same object. 
This leverages the powerful constraint and assembly building capabilities in Inventor to drive animations and transformations on the web.



https://github.com/user-attachments/assets/12f5f12e-8756-453b-a23d-b179fd357c0d



## Description

This repository consists of a simple front end application (vanilla JS and Jquery) that initializes the APS viewer with a model, and then reads transformation data from a text file.
It then uses the data to transform each component of the model using the APS viewer API and the fragment proxy objects of each component. It also includes the VB script (in the form of an iLogic rule)
that is used to gather the animation data from any Inventor assembly (with some very minor modifications to describe how the assembly moves).

## Getting Started

### Prerequisites

* Autodesk Inventor Professional and an assembly to be animated.
* How to get started with the APS Viewer: [Viewer Basics](https://aps.autodesk.com/en/docs/viewer/v7/developers_guide/viewer_basics/)
* How to move and rotate objects in the viewer: [Complex Viewer Transformations](https://aps.autodesk.com/blog/know-how-complex-component-transformations-viewer-part-1-basics)



### How to run the program
#### To run model example in repository
* download repo and extract zip folder
* If you would like to run the app without needing a back-end (you would only need it for authorization), change the options variable to 'local' in the ForgeViewer.js file
```
options {
    //env: 'AutodeskProduction',
    env: 'local',
}
```
* run local server or just open html file (SVFTest.html)
#### To run with your own Inventor Assembly
* download repo and extract zip
* create an iLogic rule in your assembly file and copy the contents of the 'iLogicScript.vb' file into it
* slightly modify the script as proposed in the comments of the rule. Within the frame for loop, add your own parameters and constraints to drive. For example:
```
for oTime = 0 to 60
    Parameter("Your Parameter") = 1 + oTime * 2
next
```
will drive the parameter from 0 to 120, all of the component data will be gathered during this movement and exported to a .txt file
* now translate the assembly to .svf and load the model into the viewer: 
* You will need to update the max attribute of the slider to match the length of the frame data array. 
    * For example, if you used:
```
for oTime = 0 to 60
```
then you must update the line in ForgeVeiwer.js to:
```
$("#doorSlider").attr("max", 60);
```


## Version History

* 0.1
    * Initial Release

## Acknowledgments

Inspiration, code snippets, etc.
* [Viewer Rotations Blog Post](https://aps.autodesk.com/cloud_and_mobile/2016/07/rotate-component-control-for-the-viewer.html)
* [Converting Inventor Models to SVF Blog Post](https://aps.autodesk.com/blog/speed-viewable-generation-when-using-design-automation-inventor)
* [Scissor Lift Model](https://grabcad.com/library/vehicle-scissor-jack-1)
