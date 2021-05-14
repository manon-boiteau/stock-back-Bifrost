/* Packages import */
const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
require("dotenv").config();

/* Packages initialization */
const app = express();
app.use(formidable());
app.use(cors());

/* Cloudinary initialization */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* Connection with BDD */
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/* Model */
const Product = mongoose.model("Product", {
  product_name: String,
  product_brand: String,
  product_price: Number,
  product_quantity: Number,
  product_image: { type: mongoose.Schema.Types.Mixed, default: {} },
});

/* ----------------------------- */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Stock Management API by Manon Boiteau for Bifröst! 🥳",
  });
});
/* ----------------------------- */

// 1 - Create a product
app.post("/create", async (req, res) => {
  try {
    const { name, brand, price, quantity } = req.fields;

    /* Check - does the product already exists in BDD? */
    const nameReg = new RegExp(name, "i");

    const findDouble = await Product.findOne({ product_name: nameReg });

    if (!findDouble) {
      const newProduct = new Product({
        product_name: name,
        product_brand: brand,
        product_price: price,
        product_quantity: quantity,
      });

      /* Save images on Cloudinary */
      if (req.files) {
        const pictureOfProduct = req.files.image.path;

        const result = await cloudinary.uploader.upload(pictureOfProduct, {
          folder: `/bifrost/product/${newProduct._id}`,
          public_id: "preview",
        });
        newProduct.product_image = result;
      }

      await newProduct.save();
      res.status(201).json(newProduct);
    } else {
      res
        .status(400)
        .json({ error: { message: "This product already exists." } });
    }
  } catch (error) {
    res.status(400).json({ error: error.massage });
  }
});

// 2 - Read all the products
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// 3 - Update a product ⇢ to be continued on the frontend part
app.post("/update/:id", async (req, res) => {
  const productToUpdate = await Product.findById(req.params.id);
  const { name, brand, price, quantity } = req.fields;
  try {
    if (name) {
      productToUpdate.product_name = name;
    }
    if (brand) {
      productToUpdate.product_brand = brand;
    }
    if (price) {
      productToUpdate.product_price = price;
    }
    if (quantity) {
      productToUpdate.product_quantity = quantity;
    }

    /* Update also images on Cloudinary */
    if (req.files.image) {
      const result = await cloudinary.uploader.upload(req.files.image.path, {
        public_id: `bifrost/product/${productToUpdate._id}`,
      });
      productToUpdate.product_image = result;
    }

    await productToUpdate.save();

    res.status(200).json("Product was modified succesfully.");
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// 3 - Update a product
// Add a quantity
app.get("/product/add", async (req, res) => {
  try {
    const productToUpdate = await Product.findById(req.query.id);

    if (productToUpdate) {
      productToUpdate.product_quantity += 1;

      await productToUpdate.save();

      res
        .status(200)
        .json({ message: "Product has been successfully updated." });
    } else {
      res.status(400).json({ error: { message: "Bad request" } });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

// 3 - Update
// Remove a quantity
app.get("/product/remove", async (req, res) => {
  try {
    const productToUpdate = await Product.findById(req.query.id);

    if (productToUpdate) {
      if (productToUpdate) {
        productToUpdate.product_quantity -= 1;

        await productToUpdate.save();

        res.status(200).json(productToUpdate);
      } else {
        res.status(400).json({ error: { message: "Invalid quantity" } });
      }
    } else {
      res.status(400).json({ error: { message: "Bad request" } });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4 - Delete a product
app.post("/delete/:id", async (req, res) => {
  try {
    await cloudinary.api.delete_resources_by_prefix(
      `/bifrost/product/${req.params.id}`
    );

    productToDelete = await Product.findById(req.params.id);

    await productToDelete.delete();

    res.json({ message: "The product has been successfully deleted" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/* ----------------------------- */

app.all("*", (req, res) => {
  res.status(404).json({ message: "This endpoint does not exist." });
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server says 'hello' 🌈");
});
