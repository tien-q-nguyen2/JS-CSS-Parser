(function(){
	var codeInput = '';
	function getCodeFromTextArea() {
		var val = document.getElementById('code-input').value;
		codeInput = val;
	}
	
	function addClassToElement(className, element) {
		element.className += ' ' + className;
	}
	
	function getStringWithUniqueClasses(element) {
		var foundClasses = element.className.split(' ').map(item => item.trim());
		var uniqueClasses = [...new Set(foundClasses)];
		return uniqueClasses.join(' ');
	}
	
	function removeClassFromElement(className, element) {
		//Make sure the classe names are unique as replace() only replace one instance
		element.className = getStringWithUniqueClasses(element);
		element.className = element.className.replace(className, '');
	}
	
	//Input and output will be saved if a code formatting button has been pressed
	var savedCodeInput = localStorage.getItem('codeInput');
	document.getElementById('code-input').innerHTML = savedCodeInput;
	var savedCodeOutput = localStorage.getItem('codeOutput');
	document.getElementById('code-output').innerHTML = savedCodeOutput;
	
	
	var layoutFlippedString = localStorage.getItem('layoutFlipped');
	if (layoutFlippedString === 'true'){
		layoutFlipped = true;
	}
	else if (layoutFlippedString === 'false'){
		layoutFlipped = false;
	}
	
	// If data about the layout being flipped from last time is unavailable
	if (layoutFlippedString === null){
		layoutFlipped = false; //set to default value
	}
	if (layoutFlipped === true){
		//flipLayoutOrientation(false) will flip the orientation and return true
		layoutFlipped === flipLayoutOrientation(!layoutFlipped);
	}
	
	var orientationButton = document.getElementById('orientation-btn');
	orientationButton.addEventListener('click', function() {
		layoutFlipped = flipLayoutOrientation(layoutFlipped);
	})
	
	function flipLayoutOrientation(isFlipped){
		var mainArea = document.getElementsByClassName('main-area')[0];
		var buttons = mainArea.getElementsByTagName('button');
		var buttonContainer = document.getElementsByClassName('button-container')[0];
		var textAreas = document.getElementsByTagName('textarea');
		
		if(isFlipped == false){
			addClassToElement('main-area-flipped', mainArea);
			for (var i = 0; i < buttons.length; i++){
				addClassToElement('button-flipped', buttons[i]);
			}
			addClassToElement('button-container-flipped', buttonContainer);
			for (var i = 0; i < textAreas.length; i++){
				addClassToElement('textarea-flipped', textAreas[i]);
			}
		}
		else {
			removeClassFromElement('main-area-flipped', mainArea);
			for (var i = 0; i < buttons.length; i++){
				removeClassFromElement('button-flipped', buttons[i]);
			}
			removeClassFromElement('button-container-flipped', buttonContainer);
			for (var i = 0; i < textAreas.length; i++){
				removeClassFromElement('textarea-flipped', textAreas[i]);
			}
		}
		
		localStorage.setItem('layoutFlipped', !isFlipped);
		return !isFlipped;
	}
	
	var getCodeButton = document.getElementById('fix-indent-btn');
	getCodeButton.addEventListener('click', getCodeFromTextArea);
	getCodeButton.addEventListener('click', fixIndentation);
	
	//=================FIX INDENTATION CODE SECTION==================//
	// Remove comments, regex and contents inside quotes before counting the brackets
	function getProcessedLinesOfCode(){
		var insideSingleQuotes = false;
		var insideDoubleQuotes = false;
		var insideSingleLineComment = false;
		var insideMultiLineComment = false;
		var insideLiteralRegex = false;
		
		var skipAnIteration = 0;
		
		var processedLineChars = [];
		var processedLinesOfCode = [];
		var linesOfCode = codeInput.split('\n');
		
		//Note: This loop assumes that the syntax of the provided CSS/JS code is correct
		for (var i = 0; i < linesOfCode.length; i++){
			insideSingleLineComment = false; //new line -> no more in a single line comment
			processedLineChars = []; //reset array containing chars of the current line
			var currentLine = linesOfCode[i].trim();
			for (var j = 0; j < currentLine.length; j++){
				if (skipAnIteration){
					skipAnIteration = false;
					continue;
				}
				if (insideSingleQuotes || insideDoubleQuotes || insideSingleLineComment
				|| insideMultiLineComment || insideLiteralRegex){
					if (currentLine[j] === "'"){
						insideSingleQuotes = false;
					}
					else if (currentLine[j] === '"'){
						insideDoubleQuotes = false;
					}
					else if (currentLine.substring(j, j + 2) === '*/'){
						insideMultiLineComment = false;
						skipAnIteration = true; //skip over processing the '/' after '*'
					}
					else if (currentLine[j] === '/' && currentLine[j-1] !== '\\'){
						insideLiteralRegex = false;
					}
				}
				else {
					if (currentLine[j] === "'"){
						insideSingleQuotes = true;
					}
					else if (currentLine[j] === '"'){
						insideDoubleQuotes = true;
					}
					else if (currentLine.substring(j, j + 2) === '//'){
						insideSingleLineComment = true;
						skipAnIteration = true; //skip over processing the '/' after '/'
					}
					else if (currentLine.substring(j, j + 2) === '/*'){
						insideMultiLineComment = true;
						skipAnIteration = true; //skip over processing the '*' after '/'
					}
					else if (currentLine[j] === '/'){
						insideLiteralRegex = true;
					}
					else {
						processedLineChars.push(currentLine[j]);
					}
				}
			} //end of loop iterating through the characters of a line
			processedLinesOfCode.push(processedLineChars.join(''));
		}
		return processedLinesOfCode;
	}
	
	//This function count syntactically significant } & { in a line to determine
	// whether to change the current indent level
	function countIndentOf(thisLine){ //thisLine should be a "processed" line of code
		var indent = 0;
		for (var i = 0; i < thisLine.length; i++){
			if (thisLine[i] === '{'){
				indent++;
			} else if (thisLine[i] === '}'){
				indent--;
			}
		}
		return indent;
	}
	
	function fixIndentation() {
		var currentIndentLevel = 0;
		//Lines to be indented before output & lines used to count brackets for indenting
		var linesOfCodeToOutput = codeInput.split('\n');
		var linesOfCodeToCountIndent = getProcessedLinesOfCode();
		var formattedOutput = '';
		for (var i = 0; i < linesOfCodeToOutput.length; i++){
			var lineToCountIndent = linesOfCodeToCountIndent[i].trim();
			var lineToOutput = linesOfCodeToOutput[i].trim();
			
			var actualIndentAmount;
			if (lineToCountIndent[0] === '}') {
				actualIndentAmount = currentIndentLevel - 1;
			}
			else actualIndentAmount = currentIndentLevel;
			
			for (var j = 0; j < actualIndentAmount; j++){
				formattedOutput += '\t';
			} //After adding indentation, add the trimmed line of code then a newline
			formattedOutput += lineToOutput + '\n';
			//Count and adjust current indent using the processed line of code
			currentIndentLevel += countIndentOf(lineToCountIndent);
		}
		localStorage.setItem('codeInput', codeInput);
		localStorage.setItem('codeOutput', formattedOutput);
		
		document.getElementById('code-output').innerHTML = formattedOutput;
	}

})();

