# Stripe Setup Guide

This guide will help you configure Stripe for the billing system.

## Understanding Product IDs vs Price IDs

**Important**: Stripe uses two different types of IDs:

- **Product ID**: Starts with `prod_` (e.g., `prod_T9zE4QYhjXOw2f`)
  - Represents a product/service you're selling
  - Cannot be used directly in checkout sessions
  
- **Price ID**: Starts with `price_` (e.g., `price_1234567890abcdef`)
  - Represents a specific pricing tier for a product
  - This is what you need for checkout sessions
  - Each product can have multiple prices (monthly, yearly, etc.)

## Finding Your Stripe Price ID

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** in the left sidebar
3. Click on your product (e.g., "Premium Plan")
4. You'll see a list of prices associated with that product
5. Find the price for $3/month
6. Copy the **Price ID** (starts with `price_`)

## Setting Environment Variables in Vercel

### Backend Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:

   **Variable Name**: `STRIPE_PRICE_MONTHLY`
   
   **Value**: Your Stripe price ID (e.g., `price_1234567890abcdef`)
   
   **Environment**: Select all environments (Production, Preview, Development)

### Frontend Environment Variables (Optional)

If you want to use the price ID on the frontend as well:

   **Variable Name**: `VITE_STRIPE_PRICE_ID_MONTHLY`
   
   **Value**: Same price ID as above
   
   **Environment**: Select all environments

## Current Configuration

The billing system is configured to:
- Use `STRIPE_PRICE_MONTHLY` from backend environment variables
- Fall back to the price ID provided in the checkout session request
- Validate that product IDs are not used (will throw an error)

## Testing Checklist

After setting up your environment variables:

- [ ] Verify `STRIPE_PRICE_MONTHLY` is set in Vercel backend environment variables
- [ ] Ensure the value starts with `price_` (not `prod_`)
- [ ] Test creating a checkout session from the billing page
- [ ] Verify the checkout session redirects to Stripe correctly
- [ ] Complete a test payment (use Stripe test card: `4242 4242 4242 4242`)
- [ ] Verify subscription is created in Stripe dashboard
- [ ] Check that subscription data appears on billing page after payment

## Common Issues

### Error: "No such price: 'prod_...'"

**Problem**: You're using a product ID instead of a price ID.

**Solution**: 
1. Find the correct price ID in Stripe dashboard (starts with `price_`)
2. Update `STRIPE_PRICE_MONTHLY` environment variable with the price ID

### Error: "priceId is required for new subscriptions"

**Problem**: `STRIPE_PRICE_MONTHLY` environment variable is not set.

**Solution**: 
1. Add `STRIPE_PRICE_MONTHLY` to your Vercel backend environment variables
2. Redeploy your backend application

### Checkout session works but subscription doesn't appear

**Problem**: Webhook might not be configured or subscription webhook handler has an issue.

**Solution**:
1. Check Stripe webhook configuration in dashboard
2. Verify webhook endpoint is receiving events
3. Check server logs for webhook processing errors

## Stripe Test Cards

For testing, use these Stripe test card numbers:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Support

If you continue to have issues:
1. Check server logs for detailed error messages
2. Verify Stripe API keys are correct
3. Ensure webhook secret is configured if using webhooks
4. Check Stripe dashboard for subscription status

