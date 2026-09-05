import mongoose from 'mongoose';
import { Item } from './src/modules/items/item.schema';

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const search = "red";
  try {
    const exprFilters = [{
      $gt: [
        {
          $size: {
            $filter: {
              input: { $objectToArray: "$dynamicData" },
              as: "field",
              cond: {
                $or: [
                  {
                    $regexMatch: {
                      input: { $convert: { input: "$$field.v", to: "string", onError: "", onNull: "" } },
                      regex: search,
                      options: "i"
                    }
                  }
                ]
              }
            }
          }
        },
        0
      ]
    }];
    
    const items = await Item.find({ $expr: { $and: exprFilters } }).limit(2);
    console.log("Success! Items found:", items.length);
  } catch (e) {
    console.error("Error:", e.message);
  }
  process.exit();
});
