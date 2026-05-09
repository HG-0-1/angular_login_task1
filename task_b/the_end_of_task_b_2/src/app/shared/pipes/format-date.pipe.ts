import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'formatDate',
    standalone: true
})
export class FormatDatePipe implements PipeTransform{
transform(value: string | number | Date): string {
    if (value == null || value == undefined) 
        return '';
    const date = new Date(value);

    if (isNaN(date.getTime())){
        return 'Invalid date';
    }
    return date.toLocaleString();
}
}

