import { isObject } from '../../utils';
import { isValidObjectId } from 'mongoose';

export const camelCaseKeysToSnakeCase = (obj) => {
  if (!isObject(obj)) return obj;

  for (const oldName in obj) {
    if (obj.hasOwnProperty(oldName)) {
      // Camel to underscore
      const newName = oldName.replace(/([A-Z])/g, function ($1) {
        return '_' + $1.toLowerCase();
      });

      let keyValue = obj[oldName];

      // Only process if names are different
      if (newName != oldName) {
        // Check for the old property name to avoid a ReferenceError in strict mode.
        if (obj.hasOwnProperty(oldName)) {
          obj[newName] = obj[oldName];

          delete obj[oldName];
        }
      } else {
        // done so structure is retained
        if ('_id' in obj) {
          obj.id = String(obj._id);

          delete obj._id;
        } else {
          delete obj[oldName];

          obj[oldName] = keyValue;
        }
      }

      // Recursion
      if (!isValidObjectId(obj[newName]) && isObject(obj[newName])) {
        if (Object.keys(obj[newName]).length < 1) {
          // delete empty objects
          delete obj[newName];
        } else {
          obj[newName] = camelCaseKeysToSnakeCase(obj[newName]);
        }
      } else if (Array.isArray(obj[newName])) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        obj[newName] = formatResponse(obj[newName]);
      }
    }
  }

  return obj;
};

export const formatResponse: {
  (data: any);
} = (data) => {
  try {
    if (data) {
      if (isValidObjectId(data)) {
        data = {
          id: data,
        };
      } else if (!isValidObjectId(data) && isObject(data)) {
        if (data._doc) {
          data = data._doc;
        }

        delete data.__v;

        if ('_id' in data) {
          delete data.id;
        }

        data = camelCaseKeysToSnakeCase(data);
      } else if (Array.isArray(data)) {
        for (let index = 0; index < data.length; index++) {
          let datum = data[index];
          if (!isValidObjectId(datum) && isObject(datum)) {
            if (datum._doc) {
              datum = datum._doc;
            }

            if ('_id' in datum) {
              delete datum.id;
            }
            delete datum.__v;

            data[index] = camelCaseKeysToSnakeCase(datum);
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
  return data;
};
