AddReference "Newtonsoft.Json.dll"
'This iLogic rule creates the "Frame Data" of the assembies components and exports it in an object format to a .txt file

'Define the AnnimationObject which we will be adding the data to
Public Class AnnimationObject

	Public Property NodeNames As ArrayList
	Public oMatricies As ArrayList
	Public oOriginMatrix(15) As Double
End Class



Sub Main()

	Dim oAnnimationCollection As New ArrayList

	'This array will contain the transformation data for each component for the current frame
	Dim oMatrixData(15) As Double
	'This array will contain the initial transformation of each component
	Dim oMatrixDataOrigin(15) As Double


	For Each oComp In ThisAssembly.Components
		If oComp.Occurrence.Visible Then
			'create new object instance for each visible component
			oObject = New AnnimationObject()
			oObject.NodeNames = New ArrayList
			'Add component name to array list, this array typically contains just one name 
			'but can contain more If they are known To have the same transformation
			oObject.NodeNames.Add(oComp.Name)
			oObject.oMatricies = New ArrayList
			oAnnimationCollection.Add(oObject)
		End If
	Next


	Dim oOriginMatricies As New ArrayList
	'define the transformation matricies thatt will be used in loop
	'oTransform must be initialized since we will be setting the data instead of setting it equal to an object
	Dim oTransform As Matrix = ThisServer.TransientGeometry.CreateMatrix
	Dim oTransformationOrigin As Matrix
	Dim oTransformNew As Matrix


	'Here is where the frame data is captured, the idea is to drive one or multiple constraints or parameters, and them read the transformation
	'In this example, we want approx 3 seconds of annimation at 60FPS, so we are collecting 180 frames
	For oTime = 0 To 88
		'drive and update constraints and trigger an immediate update
		Parameter("PivotDriveAngleLeft") = -oTime
		ThisAssembly.Document.Update()
		'loop through each component in the object collection to collect the data
		For x = 0 To oAnnimationCollection.Count - 1

			oObject = oAnnimationCollection.Item(x)
			'Collect the initial transformation data
			If oTime = 0 Then
				'The initial transformation must be relitive to the assemblie's range box center point
				'This becomes relevant later when we apply rotations in the viewer
				oRangeBox = ThisAssembly.Document.ComponentDefinition.RangeBox
				oMinPoint = oRangeBox.MinPoint
				oMaxPoint = oRangeBox.MaxPoint

				oCenterPoint = ThisServer.TransientGeometry.CreateVector((oMinPoint.X + oMaxPoint.X) / 2, (oMinPoint.Y + oMaxPoint.Y) / 2, (oMinPoint.Z + oMaxPoint.Z) / 2)
				'Get the components transformation, later we will set the translation portion
				oTransformationOrigin = ThisAssembly.Components.Item(CStr(oObject.NodeNames(0))).Occurrence.Transformation.Copy

				oOriginVector = oTransformationOrigin.Translation.Copy
				oOriginVectorCopy = oTransformationOrigin.Translation.Copy
				'Get the components translation relitive to the assembly center
				oOriginVectorCopy.SubtractVector(oCenterPoint)
				'set the matrix translation portion
				oTransformationOrigin.SetTranslation(oOriginVectorCopy)
				
				oOriginMatricies.Add(oTransformationOrigin)
				'get matrix data as an array, that way it can be put into our object for export
				oTransformationOrigin.GetMatrixData(oMatrixDataOrigin)
				oObject.oOriginMatrix = oMatrixDataOrigin

			Else
				'if it isn't the initial point in time, we just want to copy its origional transformation to calculate the relitive transformation for this frame
				oTransformationOrigin = oOriginMatricies(x).Copy
			End If
			oOriginTranslation = oTransformationOrigin.Translation
			

			oTransformNew = ThisAssembly.Components.Item(CStr(oObject.NodeNames(0))).Occurrence.Transformation.Copy
			'Find the compontents current translation and subtract from it the original translation to get its relitive translation
			oDeltaVector = oTransformNew.Translation
			oDeltaVector.SubtractVector(oOriginTranslation)


			'The method used to get the relitive rotation is to get the origional coordinate system relitive to the global coordinate system,
			'do the same for the new coordinate system, and get the matrix that aligns the two.
			'Otherwise the rotation will be relitive to the component coordinate system and not the assembly's.
			oTransformationOrigin.GetCoordinateSystem(oOrigin, xAxis, yAxis, zAxis)
			oTransformNew.GetCoordinateSystem(oOrigin2, xAxis2, yAxis2, zAxis2)

			oTransform.SetToAlignCoordinateSystems(oOrigin, xAxis, yAxis, zAxis, oOrigin2, xAxis2, yAxis2, zAxis2)
			oTransform.SetTranslation(oDeltaVector)

			'logging a specific component's matrix to verify
			'get data as an array to put into the object
			oTransform.GetMatrixData(oMatrixData)
			oObject.oMatricies.Add(oMatrixData)
			'go to next component
		Next
		'go to next frame
	Next
	'convert object to a string
	jsonString = Newtonsoft.Json.JsonConvert.SerializeObject(oAnnimationCollection)
	'reset constraints and parameters back to original positions
	Parameter("PivotDriveAngleLeft") = 0
	'output frame data as .txt file
	ouputFolder = ThisDoc.Path
	System.IO.File.WriteAllText(ouputFolder & "\AnnimationProps.txt", jsonString)
End Sub


'subrotine to print matrix data in format that makes sense. For debugging purposes
Sub printMatrix(oMatrix As Matrix, oName As String)
	Dim oRowText As String
	Logger.Info("_____________________")
	Logger.Info(oName)
	For x = 1 To 4
		oRowText = ""
		For y = 1 To 4
			oRowText = oRowText & "," & CStr(Round(oMatrix.Cell(x, y), 3))
		Next
		Logger.Info("Row: " & oRowText)
	Next

End Sub
