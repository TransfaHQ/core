import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';

export function IsIsoDateOrDateTime(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIsoDateOrDateTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          const trimmed = value.trim();

          const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;
          const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

          const isMatch = isoDateOnly.test(trimmed) || isoDateTime.test(trimmed);

          if (!isMatch) return false;

          const parsed = new Date(trimmed);
          return !isNaN(parsed.getTime());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be ISO 8601 date (YYYY-MM-DD) or datetime (YYYY-MM-DDTHH:mm:ss.sssZ)`;
        },
      },
    });
  };
}
