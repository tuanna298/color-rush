export class Physics {
    static isColliding(aRect, bRect, padding = 0) {
        return !(
            aRect.bottom - padding < bRect.top + padding ||
            aRect.top + padding > bRect.bottom - padding ||
            aRect.right - padding < bRect.left + padding ||
            aRect.left + padding > bRect.right - padding
        );
    }

    static getRect(element) {
        return element.getBoundingClientRect();
    }
}
