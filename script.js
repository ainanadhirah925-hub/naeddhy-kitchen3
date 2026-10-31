const API = {
    mealDB: "https://www.themealdb.com/api/json/v1/1",
    edamam: "https://api.edamam.com/api/recipes/v2",
    spoonacular: "https://api.spoonacular.com/recipes"
};

// Edamam API - boleh dibiarkan kosong dahulu
const EDAMAM_APP_ID = "";
const EDAMAM_APP_KEY = "";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const recipeList = document.getElementById("recipeList");
const recipeDetail = document.getElementById("recipeDetail");
const statusText = document.getElementById("status");

let recipes = [];

searchBtn.addEventListener("click", searchRecipes);

searchInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        searchRecipes();
    }
});

// SEARCH RECIPE
async function searchRecipes() {

    const query = searchInput.value.trim();

    if (!query) {
        statusText.textContent = "Please enter a food name!";
        return;
    }

    statusText.textContent = "Searching recipes... Please wait.";
    recipeList.innerHTML = "";
    recipeDetail.innerHTML = "";
    searchBtn.disabled = true;

    const requests = [];

    // THEMEALDB API
    requests.push(
        fetch(`${API.mealDB}/search.php?s=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("TheMealDB connection failed");
                }
                return response.json();
            })
            .then(data => ({
                source: "TheMealDB",
                data: data
            }))
    );

    // EDAMAM API - only when keys are available
    const hasEdamamKey =
        EDAMAM_APP_ID.trim() !== "" &&
        EDAMAM_APP_KEY.trim() !== "";

    if (hasEdamamKey) {

        const edamamUrl =
            `${API.edamam}?type=public&q=${encodeURIComponent(query)}` +
            `&app_id=${encodeURIComponent(EDAMAM_APP_ID)}` +
            `&app_key=${encodeURIComponent(EDAMAM_APP_KEY)}`;

        requests.push(
            fetch(edamamUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Edamam connection failed");
                    }
                    return response.json();
                })
                .then(data => ({
                    source: "Edamam",
                    data: data
                }))
        );
    }

    const results = await Promise.allSettled(requests);

    recipes = [];

    let successfulAPIs = 0;

    results.forEach(result => {

        if (result.status !== "fulfilled") {
            console.error("API error:", result.reason);
            return;
        }

        successfulAPIs++;

        const source = result.value.source;
        const data = result.value.data;

        // THEMEALDB RESULTS
        if (source === "TheMealDB") {

            const meals = data.meals || [];

            meals.forEach(meal => {

                recipes.push({
                    id: meal.idMeal,
                    name: meal.strMeal,
                    image: meal.strMealThumb,
                    source: "TheMealDB",
                    category: meal.strCategory || "Recipe",
                    area: meal.strArea || "Unknown",
                    instructions: meal.strInstructions ||
                        "No instructions available."
                });

            });
        }

        // EDAMAM RESULTS
        if (source === "Edamam") {

            const hits = data.hits || [];

            hits.forEach(hit => {

                const recipe = hit.recipe;

                recipes.push({
                    id: recipe.uri,
                    name: recipe.label,
                    image: recipe.image,
                    source: "Edamam",
                    category: recipe.dishType?.[0] || "Recipe",
                    area: recipe.cuisineType?.[0] || "Various",
                    ingredients: recipe.ingredientLines || [],
                    instructions: recipe.url
                });

            });
        }

    });

    searchBtn.disabled = false;

    if (recipes.length === 0) {

        if (successfulAPIs === 0) {
            statusText.textContent =
                "Unable to connect. Please check your internet connection.";
        } else {
            statusText.textContent =
                "No recipes found. Try searching Chicken, Pasta or Cake.";
        }

        return;
    }

    statusText.textContent =
        `Found ${recipes.length} recipes!`;

    displayRecipes(recipes);
}

// DISPLAY RECIPE
function displayRecipes(data) {

    recipeList.innerHTML = "";

    data.forEach((recipe, index) => {

        const card = document.createElement("div");
        card.className = "recipe-card";

        const image = document.createElement("img");
        image.src = recipe.image;
        image.alt = recipe.name;
        image.loading = "lazy";

        const title = document.createElement("h3");
        title.textContent = recipe.name;

        const source = document.createElement("p");
        source.textContent = `Source: ${recipe.source}`;

        const button = document.createElement("button");
        button.textContent = "View Recipe";

        button.addEventListener("click", function() {
            showDetails(index);
        });

        card.append(image, title, source, button);

        recipeList.appendChild(card);

    });
}

// SHOW RECIPE DETAILS
function showDetails(index) {

    const recipe = recipes[index];

    recipeDetail.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = recipe.name;

    const image = document.createElement("img");
    image.src = recipe.image;
    image.alt = recipe.name;

    const category = document.createElement("p");
    category.textContent = `Category: ${recipe.category}`;

    const area = document.createElement("p");
    area.textContent = `Cuisine: ${recipe.area}`;

    recipeDetail.append(title, image, category, area);

    if (recipe.source === "TheMealDB") {

        const heading = document.createElement("h3");
        heading.textContent = "Cooking Instructions";

        const instructions = document.createElement("p");
        instructions.textContent = recipe.instructions;

        recipeDetail.append(heading, instructions);

    } else {

        const heading = document.createElement("h3");
        heading.textContent = "Ingredients";

        const ingredients = document.createElement("p");
        ingredients.textContent =
            recipe.ingredients.join("\n");

        const link = document.createElement("a");
        link.href = recipe.instructions;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View Full Cooking Instructions";

        recipeDetail.append(heading, ingredients, link);

    }

    recipeDetail.scrollIntoView({
        behavior: "smooth"
    });
}

// OPENING HOURS
function checkOpeningHours() {

    const now = new Date();

    const currentTime =
        now.getHours() * 60 + now.getMinutes();

    const openingTime = 8 * 60;
    const closingTime = 22 * 60;

    const status = document.getElementById("openStatus");

    if (!status) return;

    if (
        currentTime >= openingTime &&
        currentTime < closingTime
    ) {
        status.textContent = "🟢 NOW OPEN";
    } else {
        status.textContent = "🔴 NOW CLOSED";
    }
}

checkOpeningHours();
setInterval(checkOpeningHours, 60000);
// EXPLORE BY CUISINE

async function searchCuisine(area) {

    statusText.textContent = `Searching ${area} recipes...`;
    recipeList.innerHTML = "";
    recipeDetail.innerHTML = "";

    try {

        // Cari makanan mengikut negara atau kawasan
        const response = await fetch(
            `${API.mealDB}/filter.php?a=${encodeURIComponent(area)}`
        );

        if (!response.ok) {
            throw new Error("Unable to connect to recipe API");
        }

        const data = await response.json();
        const meals = data.meals || [];

        if (meals.length === 0) {
            statusText.textContent =
                `Sorry, no ${area} recipes found. Try another cuisine.`;
            return;
        }

        // Ambil maklumat penuh untuk setiap resipi
        const selectedMeals = meals.slice(0, 9);

        const detailResults = await Promise.all(
            selectedMeals.map(async meal => {

                const detailResponse = await fetch(
                    `${API.mealDB}/lookup.php?i=${meal.idMeal}`
                );

                const detailData = await detailResponse.json();

                return detailData.meals
                    ? detailData.meals[0]
                    : null;
            })
        );

        recipes = detailResults
            .filter(meal => meal !== null)
            .map(meal => ({
                id: meal.idMeal,
                name: meal.strMeal,
                image: meal.strMealThumb,
                source: "TheMealDB",
                category: meal.strCategory || "Recipe",
                area: meal.strArea || area,
                instructions: meal.strInstructions ||
                    "No instructions available."
            }));

        if (recipes.length === 0) {
            statusText.textContent = "No recipes found.";
            return;
        }

        statusText.textContent =
            `Found ${recipes.length} ${area} recipes!`;

        displayRecipes(recipes);

        // Scroll ke bahagian hasil carian
        recipeList.scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {

        console.error("Cuisine search error:", error);

        statusText.textContent =
            "Unable to load recipes. Please check your internet connection.";

    }
}

// Apabila kad cuisine ditekan
document.querySelectorAll(".cuisine-card").forEach(card => {

    card.addEventListener("click", function() {

        const area = this.dataset.area;

        searchCuisine(area);

    });

});
