// This plugin will open a window to prompt the user to enter CSV data, 
// and it will then create sticky notes for each entry

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).


// Import PapaParse, to help with importing CSV data which can be pretty messy
// https://www.papaparse.com/docs
import * as Papa from 'papaparse';


// This shows the HTML page in "ui.html".
figma.showUI(__html__, { themeColors: true, width: 320, height: 430 });


// Constants for grid layout
const cols = 8; // Defines the number of columns in the masonry grid layout.
const gap = 20; // Specifies the gap (in pixels) between sticky notes.

// Constants for sticky note properties
const stickyFills: Paint[] = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]; // Defines the background color of sticky notes.
const stickyFontSize = 16; // Sets the font size used in sticky notes.
const stickyAuthorVisible = false; // Determines whether the author's name is visible on the sticky notes.


// Calls to "parent.postMessage" from within the HTML page will trigger this callback.
// The callback will be passed the "pluginMessage" property of the posted message.
figma.ui.onmessage = async msg => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property.
  if (msg.type === 'create-stickies') {

    const csvData = msg.csvData; // Retrieves the CSV data from the message

    try {

      // Parses the CSV data into an array of strings
      const arrayData = await parseData(csvData);

      // Arrays to track the layout of sticky notes in each column
      const columnHeights = new Array(cols).fill(0); // Tracks the Y-position for the bottom of sticky notes in each column
      const columnMaxWidths = new Array(cols).fill(0); // Tracks the maximum width of sticky notes in each column

      // Iterate over each piece of data and create a sticky note
      for (const value of arrayData) {
        // Determine which column to place the sticky note in
        const columnIndex = columnHeights.indexOf(Math.min(...columnHeights));
        // Calculate the X-coordinate for the sticky note
        const x = columnIndex === 0 ? 0 : columnMaxWidths.slice(0, columnIndex).reduce((a, b) => a + b + gap, 0);
        // Get the current Y-coordinate for the column
        const y = columnHeights[columnIndex];

        // Create the sticky note and get its dimensions
        const sticky = await createStickyNote(value, x, y);

        // Update the column height and maximum width for future sticky notes
        columnHeights[columnIndex] += sticky.height + gap;
        columnMaxWidths[columnIndex] = Math.max(columnMaxWidths[columnIndex], sticky.width);

      }

      // Close the plugin after all sticky notes have been created
      figma.closePlugin();
    } catch (error) {
      // Log any errors that occur and close the plugin with an error message
      console.error("Error creating stickies:", error);
      figma.closePlugin("Error occurred");
    }
  }
};

// Function to create and return a sticky note with specified text and position
async function createStickyNote(text: string, x: number, y: number): Promise<SceneNode> {
  // Load the font for the sticky note
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });

  // Create the sticky note and set its properties
  let sticky = figma.createSticky();
  sticky.x = x; // Set the X-coordinate
  sticky.y = y; // Set the Y-coordinate
  sticky.fills = stickyFills; // Apply the fill color
  sticky.text.fontSize = stickyFontSize; // Set the font size
  sticky.authorVisible = stickyAuthorVisible; // Set author visibility
  sticky.text.characters = text; // Set the text content

  // Add the sticky note to the current page
  figma.currentPage.appendChild(sticky);
  return sticky;
}


/*
function parseData(csvData: string): string[] {
  // Split the CSV data by newline characters to separate each row
  return csvData.split('\n');
}
*/

// Define the type for the parsed CSV data. This might be an array of objects if headers are used,
// or an array of arrays if no headers are used. Adjust according to your CSV structure.
type ParsedCsvData = Array<Record<string, string>> | string[][];

// Function to parse CSV data into an array of strings
function parseData(csvData: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
          complete: (results: Papa.ParseResult<string[]>) => {
              // Map over the parsed data to extract the first element of each inner array
              const parsedRows = results.data.map(innerArray => innerArray[0]);
              resolve(parsedRows);
          },
          error: (error) => {
              reject(error);
          },
          header: false // No headers in the CSV
      });
  });
}