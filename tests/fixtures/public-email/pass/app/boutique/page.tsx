// A shop publishes its own address: data of the customer, built from a variable.
export default function Shop({ shop }: { shop: { publicEmail: string } }) {
  return <a href={`mailto:${shop.publicEmail}`}>{shop.publicEmail}</a>;
}
