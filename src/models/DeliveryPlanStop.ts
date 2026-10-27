import mongoose, {
    Schema,
    model,
    models,
  } from "mongoose";
  
  const PlannedPreorderSchema = new Schema(
    {
      preorder: {
        type: Schema.Types.ObjectId,
        ref: "Preorder",
        required: true,
      },
  
      number: {
        type: String,
        required: true,
      },
  
      subtotal: {
        type: Number,
        default: 0,
      },
    },
    {
      _id: false,
    }
  );
  
  const DeliveryPlanStopSchema = new Schema(
    {
      plan: {
        type: Schema.Types.ObjectId,
        ref: "DeliveryPlan",
        required: true,
        index: true,
      },
  
      client: {
        type: Schema.Types.ObjectId,
        ref: "Client",
        required: true,
      },
  
      clientSnapshot: {
        clientNumber: String,
  
        clientName: String,
  
        address: {
          addressLine: String,
          city: String,
          state: String,
          country: String,
          zipCode: String,
        },
  
        /*
         * Useful for comparison only.
         *
         * Daily routing does NOT have to respect
         * the client's normal sales route.
         */
        normalRouteCode: String,
      },
  
      /*
       * All pending orders for this client.
       *
       * These orders must always stay together.
       */
      orders: {
        type: [PlannedPreorderSchema],
        default: [],
      },
  
      orderCount: {
        type: Number,
        required: true,
      },
  
      subtotal: {
        type: Number,
        default: 0,
      },
  
      /*
       * Optimizer-generated delivery route.
       */
      slotKey: {
        type: String,
        default: null,
        index: true,
      },
  
      /*
       * Physical stop position in this delivery route.
       *
       * We calculate this later using actual road
       * optimization.
       */
      stopOrder: {
        type: Number,
        default: null,
      },
  
      locked: {
        type: Boolean,
        default: false,
      },
  
      coordinates: {
        latitude: Number,
        longitude: Number,
  
        formattedAddress: String,
  
        geocodedAt: Date,
  
        status: {
          type: String,
          enum: [
            "pending",
            "success",
            "failed",
            "manual",
          ],
          default: "pending",
        },
      },
    },
    {
      timestamps: true,
    }
  );
  
  /*
   * One client = one stop per delivery plan.
   */
  DeliveryPlanStopSchema.index(
    {
      plan: 1,
      client: 1,
    },
    {
      unique: true,
    }
  );
  
  DeliveryPlanStopSchema.index({
    plan: 1,
    slotKey: 1,
  });
  
  export default models.DeliveryPlanStop ||
    model(
      "DeliveryPlanStop",
      DeliveryPlanStopSchema
    );