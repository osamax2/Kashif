export type Coupon = {
  id: string;
  isActive: boolean;
  image: any;
};

export const COUPONS: Coupon[] = [
  {
    id: "c1",
    isActive: false,
    image: require("../assets/icons/speed.png"),
  },
  {
    id: "c2",
    isActive: true,
    image: require("../assets/icons/pothole.png"),
  },
];
