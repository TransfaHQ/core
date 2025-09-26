import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';

export function IsMetadata(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMetadata',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: Record<string, unknown>, _: ValidationArguments) {
          if (typeof value !== 'object' || value === null) return false;
          return Object.entries(value).every(
            ([key, val]) =>
              typeof key === 'string' &&
              key.length <= 255 &&
              ((typeof val === 'string' && val.length <= 255) || val === null),
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object with string keys and values (max length 255)`;
        },
      },
    });
  };
}
