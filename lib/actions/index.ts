'use server';

import { revalidatePath } from 'next/cache';
import Product from '../models/product.modal';
import { connectToDB } from '../mongoose';
import { scrapeAmazonProduct } from '../scrapper';
import { getAveragePrice, getHighestPrice, getLowestPrice } from '../utils';

export async function scrapeAndStoreProduct(productUrl: string) {
  if (!productUrl) return;

  try {
    connectToDB();

    const scrappedProduct = await scrapeAmazonProduct(productUrl);

    if (!scrappedProduct) return;

    let product = scrappedProduct;

    const existingProduct = await Product.findOne({ url: scrappedProduct.url });

    if (existingProduct) {
      const updatedPriceHistory: any = [...existingProduct.priceHistory, { price: scrappedProduct.currentPrice }];

      product = {
        ...scrappedProduct,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      };
    }

    const newProduct = await Product.findOneAndUpdate({ url: scrappedProduct.url }, product, {
      upsert: true,
      new: true,
    });

    revalidatePath(`/products/${newProduct._id}`);
  } catch (error: any) {
    throw new Error(`Failed to create/update product: ${error}`);
  }
}

export async function getProductById(productId: string) {
  try {
    connectToDB();

    const product = await Product.findOne({ _id: productId });

    if (!product) return null;

    return product;
  } catch (error: any) {
    console.log(error);
  }
}
