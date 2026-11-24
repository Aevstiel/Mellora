
// ============================================================
// DOM ELEMENTS
// ============================================================

const fileInput = document.querySelector(".file-input");
const chooseImgBtn = document.querySelector(".choose-img");
const previewImg = document.querySelector(".preview-img img");

const editorContainer = document.querySelector(".editor-container");

const filterOptions = document.querySelectorAll(".filter button");
const filterName = document.querySelector(".filter-info .name");
const filterSlider = document.querySelector(".slider input");
const filterValue = document.querySelector(".filter-info .value");


// ============================================================
// IMAGE PROCESSING VARIABLES
// ============================================================

// Original image dimensions
let imageWidth = 0;
let imageHeight = 0;

// Original image data. Never modify this.
let originalMatrix = null;

// Currently displayed image data
let currentMatrix = null;

// Store individual filter values.
let brightness = 100;
let contrast = 100;
let opacity = 100;


// ============================================================
// CANVAS INITIALIZATION
// ============================================================

// Create an internal canvas for pixel processing.
const processingCanvas = document.createElement("canvas");

// Obtain its 2D rendering context.
const processingContext = processingCanvas.getContext("2d", {
    willReadFrequently: true
});


// ============================================================
// IMAGE UPLOAD
// ============================================================

chooseImgBtn.addEventListener("click", () => {
    fileInput.click();
});


fileInput.addEventListener("change", () => {

    // Retrieve the selected image file.
    const file = fileInput.files[0];

    if (!file) return;

    // Generate a temporary URL for the uploaded image.
    const imageURL = URL.createObjectURL(file);

    // Create a separate image object for loading.
    const image = new Image();

    image.onload = () => {

        // Retrieve the original image dimensions.
        imageWidth = image.naturalWidth;
        imageHeight = image.naturalHeight;

        // Resize the processing canvas.
        processingCanvas.width = imageWidth;
        processingCanvas.height = imageHeight;

        // Draw the uploaded image onto the canvas.
        processingContext.drawImage(
            image,
            0,
            0,
            imageWidth,
            imageHeight
        );

        // Extract the image's RGBA pixel data.
        const imageData = processingContext.getImageData(
            0,
            0,
            imageWidth,
            imageHeight
        );

        // Convert the extracted data into our matrix representation.
        originalMatrix = convertToMatrix(imageData);

        // Reset all filter values when a new image is uploaded.
        brightness = 100;
        contrast = 100;
        opacity = 100;

        // Reset the interface to Brightness.
        filterOptions.forEach(option => {
            option.classList.remove("active");
        });

        document.querySelector("#brightness").classList.add("active");

        filterName.innerText = "Brightness";
        filterSlider.min = 0;
        filterSlider.max = 200;
        filterSlider.value = brightness;
        filterValue.innerText = brightness + "%";

        updateProgress(filterSlider);

        // Enable the editor.
        editorContainer.classList.remove("disable");

        // IMPORTANT:
        // Process the image through the complete filter pipeline.
        // At default values, the result will be identical to the original.
        processImage();

        console.log("Image loaded successfully.");
        console.log("Dimensions:", imageWidth, imageHeight);
        console.log("Original matrix:", originalMatrix);

        // Release the temporary URL.
        URL.revokeObjectURL(imageURL);
    };

    image.onerror = () => {
        URL.revokeObjectURL(imageURL);
        console.error("Failed to load image.");
    };

    // Start loading the image.
    image.src = imageURL;
});


// ============================================================
// IMAGE TO MATRIX CONVERSION
// ============================================================

function convertToMatrix(imageData) {

    const { width, height, data } = imageData;

    return {

        // Image width in pixels
        width: width,

        // Image height in pixels
        height: height,

        // Independent copy of the RGBA data
        pixels: new Uint8ClampedArray(data)

    };
}


// ============================================================
// BRIGHTNESS
// ============================================================

function applyBrightness(matrix, brightness) {

    // Create a new pixel array.
    const result = new Uint8ClampedArray(matrix.pixels);

    // Convert percentage into a multiplication factor.
    const factor = brightness / 100;

    // Iterate through every pixel.
    // Each pixel contains four channels: RGBA.
    for (let i = 0; i < result.length; i += 4) {

        // Red channel
        result[i] = Math.min(
            255,
            result[i] * factor
        );

        // Green channel
        result[i + 1] = Math.min(
            255,
            result[i + 1] * factor
        );

        // Blue channel
        result[i + 2] = Math.min(
            255,
            result[i + 2] * factor
        );

        // Alpha remains unchanged.
    }

    // Return the processed matrix.
    return {
        width: matrix.width,
        height: matrix.height,
        pixels: result
    };
}


// ============================================================
// CONTRAST
// ============================================================

function applyContrast(matrix, contrast) {

    // Create an independent copy of the pixel data.
    const result = new Uint8ClampedArray(matrix.pixels);

    // Convert the slider percentage into a contrast factor.
    //
    // 100% = 1.0 (original contrast)
    // 150% = 1.5 (increased contrast)
    //  50% = 0.5 (reduced contrast)

    const factor = contrast / 100;

    // The midpoint of the RGB colour range.
    const midpoint = 128;

    // Iterate through every pixel.
    // Each pixel contains four channels: RGBA.
    for (let i = 0; i < result.length; i += 4) {

        // Apply contrast to the red channel.
        result[i] = Math.min(255, Math.max(0,
            (result[i] - midpoint) * factor + midpoint
        ));

        // Apply contrast to the green channel.
        result[i + 1] = Math.min(255, Math.max(0,
            (result[i + 1] - midpoint) * factor + midpoint
        ));

        // Apply contrast to the blue channel.
        result[i + 2] = Math.min(255, Math.max(0,
            (result[i + 2] - midpoint) * factor + midpoint
        ));

        // Leave the alpha channel unchanged.
    }

    // Return the processed matrix.
    return {
        width: matrix.width,
        height: matrix.height,
        pixels: result
    };
}


// ============================================================
// OPACITY
// ============================================================

function applyOpacity(matrix, opacity) {

    // Create a new pixel array.
    const result = new Uint8ClampedArray(matrix.pixels);

    // Convert percentage into an opacity multiplier.
    //
    // 100% = 1.0 (original opacity)
    //  50% = 0.5 (half opacity)
    //   0% = 0.0 (fully transparent)

    const factor = opacity / 100;

    // Iterate through every pixel.
    for (let i = 0; i < result.length; i += 4) {

        // Leave red, green and blue unchanged.

        // Modify only the alpha channel.
        result[i + 3] = result[i + 3] * factor;
    }

    // Return the processed matrix.
    return {
        width: matrix.width,
        height: matrix.height,
        pixels: result
    };
}


// ============================================================
// APPLY ALL ACTIVE FILTERS
// ============================================================

function processImage() {

    // Make sure an image has been uploaded.
    if (!originalMatrix) return;

    // Always start with the original image.
    // This prevents cumulative degradation.
    let result = originalMatrix;

    // Apply all filters in a consistent order.
    result = applyBrightness(result, brightness);
    result = applyContrast(result, contrast);
    result = applyOpacity(result, opacity);

    // Store the final result.
    currentMatrix = result;

    // Display the processed image.
    renderMatrix(currentMatrix);
}


// ============================================================
// MATRIX TO IMAGE RENDERING
// ============================================================

function renderMatrix(matrix) {

    // Convert the matrix into browser-compatible ImageData.
    const imageData = new ImageData(
        new Uint8ClampedArray(matrix.pixels),
        matrix.width,
        matrix.height
    );

    // Write the pixel data onto the canvas.
    processingContext.putImageData(imageData, 0, 0);

    // Display the resulting image in the existing HTML preview.
    previewImg.src = processingCanvas.toDataURL("image/png");
}


// ============================================================
// SLIDER PROGRESS
// ============================================================

function updateProgress(slider) {

    const min = Number(slider.min || 0);
    const max = Number(slider.max || 100);
    const value = Number(slider.value);

    // Calculate the percentage of the track that is filled.
    const progress = max > min
        ? ((value - min) / (max - min)) * 100
        : 0;

    // Update the CSS custom property.
    slider.style.setProperty("--progress", `${progress}%`);
}


// ============================================================
// FILTER SELECTION
// ============================================================

// Handle clicks on the existing filter buttons.
filterOptions.forEach(option => {

    option.addEventListener("click", () => {

        // Remove the active class from the previous button.
        document.querySelector(".filter .active")
            .classList.remove("active");

        // Activate the selected button.
        option.classList.add("active");

        // Update the filter name.
        filterName.innerText = option.innerText;

        // Configure the slider for Brightness.
        if (option.id === "brightness") {

            filterSlider.min = 0;
            filterSlider.max = 200;
            filterSlider.value = brightness;

            filterValue.innerText = brightness + "%";

        }

        // Configure the slider for Contrast.
        else if (option.id === "contrast") {

            filterSlider.min = 0;
            filterSlider.max = 200;
            filterSlider.value = contrast;

            filterValue.innerText = contrast + "%";

        }

        // Configure the slider for Opacity.
        else if (option.id === "opacity") {

            filterSlider.min = 0;
            filterSlider.max = 100;
            filterSlider.value = opacity;

            filterValue.innerText = opacity + "%";

        }

        // Update the slider's visual progress.
        updateProgress(filterSlider);

        // Recalculate the image using the selected filter values.
        updateFilter();

    });

});


// ============================================================
// FILTER SLIDER PROCESSING
// ============================================================

function updateFilter() {

    // Make sure an image has been uploaded.
    if (!originalMatrix) return;

    const selectedFilter = document.querySelector(".filter .active");

    const value = Number(filterSlider.value);

    // Update the corresponding filter variable.
    if (selectedFilter.id === "brightness") {

        brightness = value;

    } else if (selectedFilter.id === "contrast") {

        contrast = value;

    } else if (selectedFilter.id === "opacity") {

        opacity = value;

    }

    // Update the displayed slider percentage.
    filterValue.innerText = value + "%";

    // Update the slider's visual progress.
    updateProgress(filterSlider);

    // Recalculate all active filters.
    processImage();
}


// Listen for slider movement.
filterSlider.addEventListener("input", updateFilter);


// ============================================================
// INITIAL SLIDER STATE
// ============================================================

updateProgress(filterSlider);
