import convert from "color-convert";

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DOM ELEMENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const fileInput = document.querySelector(".file-input");
const chooseImgBtn = document.querySelector(".choose-img");
const previewImg = document.querySelector(".preview-img img");

const editorContainer = document.querySelector(".editor-container");

const filterOptions = document.querySelectorAll(".filter button");
const filterName = document.querySelector(".filter-info .name");
const filterSlider = document.querySelector(".slider input");
const filterValue = document.querySelector(".filter-info .value");


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// IMAGE PROCESSING VARIABLES
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Original image dimensions
let imageWidth = 0;
let imageHeight = 0;

// Original image data.
let originalMatrix = null;

// Currently displayed image data
let currentMatrix = null;

// Store individual filter values.
let brightness = 100;
let saturation = 100;
let contrast = 100;
let grayscale = 0;
let warmth = 100;
let opacity = 100;
let hue = 100;
let inversion = 0;


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CANVAS INITIALIZATION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Create an internal canvas for pixel processing.
const processingCanvas = document.createElement("canvas");

// Obtain its 2D rendering context.
const processingContext = processingCanvas.getContext("2d", {
    willReadFrequently: true
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// IMAGE UPLOAD
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
        saturation = 100;
        contrast = 100;
        grayscale = 0;
        warmth = 100;
        opacity = 100;
        hue = 100;
        inversion = 0;

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


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// IMAGE TO MATRIX CONVERSION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// BRIGHTNESS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

        // Alpha remains unchanged because that controls opacity.
    }

    // Return the processed matrix.
    return {
        width: matrix.width,
        height: matrix.height,
        pixels: result
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// SATURATION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function applySaturation(matrix, saturation) {
    const pixels = new Uint8ClampedArray(matrix.pixels);
    const factor = saturation / 100;

    for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];

        // We used a libary we imported to convert RGB (red, green, and blue entries for each vector) 
        // to HSV (hue, saturation, and value entries for each vector in the matrix) 

        // Note:
        // We don't touch the fourth entry "Alpha" as HSV is only concerned with the represenation of colour

        // Basically, we temporarily replace the RGB components with their corresponding HSV components, 
        // which together represent the same pixel when converted back.     

        // We do this temporarily to edit the saturation without using complex algorithms that would introduce unnecessary complexity
        const hsv = convert.rgb.hsv(red, green, blue);
       
        // Arrays start from 0 so we pick 1 which is the second component, it corresponds to saturation
        hsv[1] = Math.min(100, hsv[1] * factor);

        // We convert our HSV vectors back to RGB ones in order to render it properly
        const rgb = convert.hsv.rgb(hsv);

        pixels[i] = rgb[0];
        pixels[i + 1] = rgb[1];
        pixels[i + 2] = rgb[2];
    }

    return {
        width: matrix.width,
        height: matrix.height,
        pixels: pixels
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CONTRAST
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

        result[i] = Math.min(255, Math.max(0,
            (result[i] - midpoint) * factor + midpoint
        ));

        result[i + 1] = Math.min(255, Math.max(0,
            (result[i + 1] - midpoint) * factor + midpoint
        ));

        result[i + 2] = Math.min(255, Math.max(0,
            (result[i + 2] - midpoint) * factor + midpoint
        ));

    }

    return {
        width: matrix.width,
        height: matrix.height,
        pixels: result
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// GRAYSCALE
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function applyGrayscale(matrix, grayscale) {

    // Create an independent copy of the pixel data.
    const result = new Uint8ClampedArray(matrix.pixels);

    // Convert the slider percentage into a factor between 0 and 1.
    const factor = grayscale / 100;

    // Iterate through every pixel.
    for (let i = 0; i < result.length; i += 4) {

        // Retrieve the original RGB values.
        const red = result[i];
        const green = result[i + 1];
        const blue = result[i + 2];

        // Calculate the grayscale intensity.
        const luminance =
            0.299 * red +
            0.587 * green +
            0.114 * blue;

        // Gradually interpolate between the original colour
        // and the grayscale intensity.

        result[i] = red * (1 - factor) + luminance * factor;

        result[i + 1] =
            green * (1 - factor) + luminance * factor;

        result[i + 2] =
            blue * (1 - factor) + luminance * factor;

        // Alpha remains unchanged.
    }

    // Return the processed matrix.
    return {
        width: matrix.width,
        height: matrix.height,
        pixels: result
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// WARMTH
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function applyWarmth(matrix, warmth) {
    const pixels = new Uint8ClampedArray(matrix.pixels);
    const factor = (warmth - 100) / 100;

    for (let i = 0; i < pixels.length; i += 4) {

        // Increase red and decrease blue proportionally.
        pixels[i] *= 1 + (0.25 * factor);
        pixels[i + 2] *= 1 - (0.25 * factor);

    }

    return {
        width: matrix.width,
        height: matrix.height,
        pixels: pixels
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// OPACITY
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

        // Modify only the alpha channel since this is an opacity filter.
        result[i + 3] = result[i + 3] * factor;
    }

    return {
        width: matrix.width,
        height: matrix.height,
        pixels: result
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HUE
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function applyHue(matrix, hue) {
    const pixels = new Uint8ClampedArray(matrix.pixels);

    // Convert the slider value into a hue rotation.
    // 100 = 0 degrees (no rotation).
    // 0 = -180 degrees.
    // 200 = +180 degrees.
    const rotation = (hue - 100) * 1.8;

    for (let i = 0; i < pixels.length; i += 4) {

        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];

        // Convert RGB into HSV to access the hue component just like saturation.
        const hsv = convert.rgb.hsv(red, green, blue);

        // Rotate the hue while keeping saturation and brightness.
        hsv[0] = (hsv[0] + rotation + 360) % 360;

        // Convert the modified HSV values back into RGB.
        const rgb = convert.hsv.rgb(hsv);

        pixels[i] = rgb[0];
        pixels[i + 1] = rgb[1];
        pixels[i + 2] = rgb[2];
    }

    return {
        width: matrix.width,
        height: matrix.height,
        pixels: pixels
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// INVERSION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function applyInversion(matrix, inversion) {
    const pixels = new Uint8ClampedArray(matrix.pixels);

    // Convert the slider percentage into a factor between 0 and 1.
    const factor = inversion / 100;

    for (let i = 0; i < pixels.length; i += 4) {

        // Calculate the inverted colour for each RGB channel.
        pixels[i] += (255 - 2 * pixels[i]) * factor;
        pixels[i + 1] += (255 - 2 * pixels[i + 1]) * factor;
        pixels[i + 2] += (255 - 2 * pixels[i + 2]) * factor;

    }

    return {
        width: matrix.width,
        height: matrix.height,
        pixels: pixels
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// APPLY ALL ACTIVE FILTERS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function processImage() {

    // Make sure an image has been uploaded.
    if (!originalMatrix) return;

    // Always start with the original image.
    // This prevents cumulative degradation.
    let result = originalMatrix;

    // Apply all filters in a consistent order.
    result = applyBrightness(result, brightness);
    result = applySaturation(result, saturation);
    result = applyContrast(result, contrast);
    result = applyGrayscale(result, grayscale);
    result = applyWarmth(result, warmth);
    result = applyOpacity(result, opacity);
    result = applyInversion(result, inversion);
    result = applyHue(result, hue);

    // Store the final result.
    currentMatrix = result;

    // Display the processed image.
    renderMatrix(currentMatrix);
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// MATRIX TO IMAGE RENDERING
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// SLIDER PROGRESS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// FILTER SELECTION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

        if (option.id === "brightness") {

            filterSlider.min = 0;
            filterSlider.max = 200;
            filterSlider.value = brightness;

            filterValue.innerText = brightness + "%";

        }

        else if (option.id === "saturation") {

            filterSlider.min = 0;
            filterSlider.max = 200;
            filterSlider.value = saturation;

            filterValue.innerText = saturation + "%";

        }

        else if (option.id === "contrast") {

            filterSlider.min = 0;
            filterSlider.max = 200;
            filterSlider.value = contrast;

            filterValue.innerText = contrast + "%";

        }

        else if (option.id === "grayscale") {

            filterSlider.min = 0;
            filterSlider.max = 100;
            filterSlider.value = grayscale;

            filterValue.innerText = grayscale + "%";

        }

        else if (option.id === "warmth") {
            filterSlider.min = 0;
            filterSlider.max = 200;
            filterSlider.value = warmth;

            filterValue.innerText = warmth + "%";
        }

        else if (option.id === "opacity") {

            filterSlider.min = 0;
            filterSlider.max = 100;
            filterSlider.value = opacity;

            filterValue.innerText = opacity + "%";

        }

        else if (option.id === "hue") {

            filterSlider.min = 0;
            filterSlider.max = 200;
            filterSlider.value = hue;

            filterValue.innerText = `${((hue - 100) * 1.8).toFixed(0)}°`;

        }

        else if (option.id === "inversion") {

            filterSlider.min = 0;
            filterSlider.max = 100;
            filterSlider.value = inversion;

            filterValue.innerText = inversion + "%";

        }

        // Update the slider's visual progress.
        updateProgress(filterSlider);

        // Recalculate the image using the selected filter values.
        updateFilter();

    });

});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// FILTER SLIDER PROCESSING
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function updateFilter() {

    // Make sure an image has been uploaded.
    if (!originalMatrix) return;

    const selectedFilter = document.querySelector(".filter .active");

    const value = Number(filterSlider.value);

    // Update the corresponding filter variable.
    if (selectedFilter.id === "brightness") {

        brightness = value;

    } else if (selectedFilter.id === "saturation") {

        saturation = value;

    } else if (selectedFilter.id === "contrast") {

        contrast = value;

    } else if (selectedFilter.id === "grayscale") {

        grayscale = value;

    } else if (selectedFilter.id === "warmth") {

        warmth = value;

    } else if (selectedFilter.id === "opacity") {

        opacity = value;

    } else if (selectedFilter.id === "hue") {

        hue = value;

    } else if (selectedFilter.id === "inversion") {

        inversion = value;

    }

    // Update the displayed slider percentage.
    if (selectedFilter.id === "hue") {
        filterValue.innerText = ((value - 100) * 1.8).toFixed(0) + "°";
    } else {
        filterValue.innerText = value + "%";
    }

    // Update the slider's visual progress.
    updateProgress(filterSlider);

    // Recalculate all active filters.
    processImage();
}


// Listen for slider movement.
filterSlider.addEventListener("input", updateFilter);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// INITIAL SLIDER STATE
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

updateProgress(filterSlider);
