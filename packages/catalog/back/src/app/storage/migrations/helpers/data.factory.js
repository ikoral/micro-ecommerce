import slufigy from "slugify";

const normalizeKey = (key) => slufigy(key, { lower: true });

export const catalogFactory = (query, models) => (catalogs) =>
  Promise.all(
    catalogs.map((c) =>
      models.Catalog.create({
        key: normalizeKey(c.name),
        name: c.name,
      }),
    ),
  );

export const categoryFactory = (query, models) => (categories) =>
  Promise.all(
    categories.map((c) =>
      models.Category.create({
        key: normalizeKey(`${c.catalog.key}-${c.name}`),
        name: c.name,
        catalogId: c.catalog.id,
      }),
    ),
  );

export const colorsFactory = (query, models) => async (colors) => {
  let imageUrlIndex = {};
  const createdColors = await Promise.all(
    colors.map(async (c) => {
      const createdColor = await models.Color.create({
        key: normalizeKey(c.name),
        name: c.name,
      });
      imageUrlIndex = {
        ...imageUrlIndex,
        [createdColor.key]: c.imageUrl,
      };
      return createdColor;
    }),
  );
  const colorImageRows = createdColors.map((c) => ({
    location: "color",
    url: imageUrlIndex[c.key],
    color_id: c.id,
  }));
  await query.bulkInsert("image", colorImageRows);
  return createdColors;
};

const productColorsFactory = (query) => (productId, colorIds) =>
  query.bulkInsert(
    "product_color",
    colorIds.map((id) => ({
      product_id: productId,
      color_id: id,
    })),
  );

const getSku = (product, color, sizeName) => normalizeKey(`${product.key}-${color.key}-${sizeName}`);

const sizesFactory = (query) => (product, color, price, sizes) =>
  query.bulkInsert(
    "size",
    sizes.map((s, index) => ({
      sku: getSku(product, color, s),
      name: s,
      price_cents: price,
      price_currency: "eur",
      order: index,
      product_id: product.id,
      color_id: color.id,
    })),
  );

const imagesFactory = (query) => (productId, colorId, images) =>
  query.bulkInsert(
    "image",
    images.map((i) => ({
      location: i.location,
      url: i.url,
      product_id: productId,
      color_id: colorId,
    })),
  );

export const productFactory = (query, models) => (colorIndex, products) => {
  const createProductColors = productColorsFactory(query);
  const createImages = imagesFactory(query);
  const createSizes = sizesFactory(query);
  return Promise.all(
    products.map(async (p) => {
      const product = await models.Product.create({
        key: normalizeKey(`${p.category.key}-${p.brand}-${p.name}`),
        name: p.name,
        brand: p.brand,
        categoryId: p.category.id,
      });
      const colorIds = Object.keys(p.colors);
      const promises = colorIds.map((id) => {
        const {
          sizes: { price, names: sizeNames },
          images,
        } = p.colors[id];
        const [color] = colorIndex[id];
        return Promise.all([createSizes(product, color, price, sizeNames), createImages(product.id, id, images)]);
      });
      await Promise.all([createProductColors(product.id, colorIds), ...promises]);
      return product;
    }),
  );
};

export const getNumericSizes = (from, to, incrementBy) => {
  const sizes = [];
  for (let i = from; i <= to; i += incrementBy) {
    sizes.push(String(i));
  }
  return sizes;
};
