
class Vector2
{
    public x: number;
    public y: number;

    constructor(x?: number, y?: number)
    {
        this.x = x ?? 0;
        this.y = y ?? 0;
    }

    public set(x: number, y: number)
    {
        this.x = x;
        this.y = y;
        return this;
    }

    public setScalar(s: number)
    {
        this.x = s;
        this.y = s;
        return this;
    }

    public copy(other: Vector2)
    {
        this.x = other.x;
        this.y = other.y;
        return this;
    }

    public add(other: Vector2)
    {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    public sub(other: Vector2)
    {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    public mul(other: Vector2)
    {
        this.x *= other.x;
        this.y *= other.y;
        return this;
    }

    public div(other: Vector2)
    {
        this.x /= other.x;
        this.y /= other.y;
        return this;
    }

    public addScalar(s: number)
    {
        this.x += s;
        this.y += s;
        return this;
    }

    public subScalar(s: number)
    {
        this.x -= s;
        this.y -= s;
        return this;
    }

    public mulScalar(s: number)
    {
        this.x *= s;
        this.y *= s;
        return this;
    }

    public divScalar(s: number)
    {
        this.x /= s;
        this.y /= s;
        return this;
    }

    public addVectors(a: Vector2, b: Vector2)
    {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        return this;
    }

    public subVectors(a: Vector2, b: Vector2)
    {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        return this;
    }

    public mulVectors(a: Vector2, b: Vector2)
    {
        this.x = a.x * b.x;
        this.y = a.y * b.y;
        return this;
    }

    public divVectors(a: Vector2, b: Vector2)
    {
        this.x = a.x / b.x;
        this.y = a.y / b.y;
        return this;
    }

    public dot(other: Vector2)
    {
        return this.x * other.x + this.y * other.y;
    }

    public lengthSq()
    {
        return this.dot(this);
    }

    public length()
    {
        return Math.sqrt(this.lengthSq());
    }

    public distanceToSq(other: Vector2)
    {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return dx * dx + dy * dy;
    }

    public distanceTo(other: Vector2)
    {
        return Math.sqrt(this.distanceToSq(other));
    }

    public normalize()
    {
        const length = this.length();
        this.x /= length;
        this.y /= length;
        return this;
    }

    public negate()
    {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    public negateX()
    {
        this.x = -this.x;
        return this;
    }

    public negateY()
    {
        this.y = -this.y;
        return this;
    }

    public static lerp(a: Vector2, b: Vector2, t: number, target: Vector2)
    {
        return target.set(Lerp(a.x, b.x, t), Lerp(a.y, b.y, t));
    }
}
