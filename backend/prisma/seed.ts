import { PrismaClient, Role, MovementReason, OrderType, DeliveryStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding supermarket database...');

  // Clean existing records in reverse dependency order
  await prisma.stockRefillItem.deleteMany();
  await prisma.stockRefill.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', salt);
  const staffPasswordHash = await bcrypt.hash('StaffPassword123!', salt);
  const cashierPasswordHash = await bcrypt.hash('CashierPassword123!', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Manager',
      email: 'admin@inventory.com',
      passwordHash: adminPasswordHash,
      role: Role.admin,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Staff Supervisor',
      email: 'staff@inventory.com',
      passwordHash: staffPasswordHash,
      role: Role.staff,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: 'Cashier Counter 1',
      email: 'cashier@inventory.com',
      passwordHash: cashierPasswordHash,
      role: Role.cashier,
    },
  });

  console.log('Created Users:', { admin: admin.email, staff: staff.email, cashier: cashier.email });

  // 2. Seed Customers (with unique mobile numbers)
  const customersData = [
    {
      name: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      phone: '+1 555-0199',
      address: '100 Industrial Parkway, Sector 4, Chicago, IL 60601',
      loyaltyPoints: 120,
    },
    {
      name: 'Sarah Connor',
      email: 'sarah.c@example.com',
      phone: '+1 555-0248',
      address: '742 Evergreen Terrace, Suite 300, Austin, TX 78701',
      loyaltyPoints: 45,
    },
    {
      name: 'David Chen',
      email: 'david.chen@example.com',
      phone: '+1 555-0812',
      address: '500 Technology Way, San Jose, CA 95110',
      loyaltyPoints: 310,
    },
    {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '+1 555-0433',
      address: '12 Blossom Hill Lane, Boulder, CO 80302',
      loyaltyPoints: 80,
    },
    {
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '+1 555-0955',
      address: '88 Innovation Boulevard, Boston, MA 02115',
      loyaltyPoints: 215,
    },
  ];

  const customers = await Promise.all(
    customersData.map((c) => prisma.customer.create({ data: c }))
  );
  console.log(`Created ${customers.length} customers with mobile numbers.`);

  // 3. Seed Supermarket Products with Barcodes & Categories
  const productsData = [
    {
      name: 'Organic Whole Milk 1 Gal',
      sku: 'DAIRY-MLK-001',
      barcode: '8901030010015',
      category: 'Dairy',
      description: 'Grade-A organic homogenized whole vitamin D milk.',
      unitPrice: 4.49,
      quantityInStock: 50,
      reorderThreshold: 15,
    },
    {
      name: 'Artisanal Sourdough Boule',
      sku: 'BAKE-BRD-002',
      barcode: '8901030010022',
      category: 'Bakery',
      description: 'Slow fermented naturally leavened crispy crust sourdough loaf.',
      unitPrice: 5.99,
      quantityInStock: 25,
      reorderThreshold: 10,
    },
    {
      name: 'Fresh Hass Avocados (4-Pack)',
      sku: 'PROD-AVO-003',
      barcode: '8901030010039',
      category: 'Produce',
      description: 'Ripe and ready Hass avocados rich in heart-healthy fats.',
      unitPrice: 4.99,
      quantityInStock: 4, // LOW STOCK
      reorderThreshold: 10,
    },
    {
      name: 'Italian Roast Coffee Beans 1kg',
      sku: 'PAN-COF-004',
      barcode: '8901030010046',
      category: 'Pantry',
      description: 'Dark roasted whole bean arabica blend with smoky chocolate finish.',
      unitPrice: 18.50,
      quantityInStock: 6, // LOW STOCK
      reorderThreshold: 10,
    },
    {
      name: 'Sparkling Mineral Water 6x500ml',
      sku: 'BEV-WTR-005',
      barcode: '8901030010053',
      category: 'Beverages',
      description: 'Naturally carbonated spring water with zero sodium and crisp finish.',
      unitPrice: 6.25,
      quantityInStock: 40,
      reorderThreshold: 12,
    },
    {
      name: 'Pasture-Raised Eggs Dozen',
      sku: 'DAIRY-EGG-006',
      barcode: '8901030010060',
      category: 'Dairy',
      description: 'Free roaming pasture-raised large grade AA brown eggs.',
      unitPrice: 5.80,
      quantityInStock: 30,
      reorderThreshold: 10,
    },
    {
      name: 'Crisp Honeycrisp Apples 1kg',
      sku: 'PROD-APL-007',
      barcode: '8901030010077',
      category: 'Produce',
      description: 'Extra sweet and juicy orchard picked Honeycrisp apples.',
      unitPrice: 4.20,
      quantityInStock: 60,
      reorderThreshold: 15,
    },
    {
      name: 'Dark Chocolate Bar 85% Cacao',
      sku: 'CNF-CHO-008',
      barcode: '8901030010084',
      category: 'Confectionery',
      description: 'Single origin fair-trade extra dark chocolate with Madagascar vanilla.',
      unitPrice: 3.75,
      quantityInStock: 3, // CRITICAL LOW STOCK
      reorderThreshold: 8,
    },
    {
      name: 'Cold-Pressed Extra Virgin Olive Oil 750ml',
      sku: 'PAN-OIL-009',
      barcode: '8901030010091',
      category: 'Pantry',
      description: 'First cold pressed unfiltered estate Greek extra virgin olive oil.',
      unitPrice: 14.99,
      quantityInStock: 20,
      reorderThreshold: 8,
    },
    {
      name: 'Fresh Atlantic Salmon Fillet 500g',
      sku: 'SEA-SLM-010',
      barcode: '8901030010107',
      category: 'Meat & Seafood',
      description: 'Sustainably raised boneless skin-on Atlantic salmon fillet portion.',
      unitPrice: 12.50,
      quantityInStock: 15,
      reorderThreshold: 5,
    },
  ];

  const createdProducts = [];
  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        category: item.category,
        description: item.description,
        unitPrice: item.unitPrice,
        quantityInStock: item.quantityInStock,
        reorderThreshold: item.reorderThreshold,
      },
    });
    createdProducts.push(product);

    // Record initial restock movement for audit integrity
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        changeQuantity: item.quantityInStock,
        reason: MovementReason.restock,
      },
    });
  }

  console.log(`Created ${createdProducts.length} supermarket products with barcodes.`);

  // 4. Seed a Sample Inbound Stock Refill
  const refill = await prisma.stockRefill.create({
    data: {
      referenceNo: 'REFILL-2026-001',
      supplierName: 'GreenValley Farm Supplies Ltd.',
      status: 'received',
      notes: 'Weekly fresh dairy & produce replenishment delivery',
      receivedBy: 'Staff Supervisor',
      totalItems: 45,
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 25,
            costPrice: 2.80,
          },
          {
            productId: createdProducts[1].id,
            quantity: 20,
            costPrice: 3.50,
          },
        ],
      },
    },
  });
  console.log(`Created sample stock refill: ${refill.referenceNo}`);

  // 5. Seed a Sample Item Delivery Order
  const deliveryOrder = await prisma.order.create({
    data: {
      customerId: customers[0].id,
      status: OrderStatus.confirmed,
      orderType: OrderType.item_delivery,
      deliveryStatus: DeliveryStatus.out_for_delivery,
      deliveryAddress: customers[0].address,
      deliveryNotes: 'Leave at front porch if no answer. Call +1 555-0199 upon arrival.',
      cashierId: cashier.id,
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 2,
            unitPriceAtOrder: createdProducts[0].unitPrice,
          },
          {
            productId: createdProducts[4].id,
            quantity: 1,
            unitPriceAtOrder: createdProducts[4].unitPrice,
          },
        ],
      },
    },
  });
  console.log(`Created sample item delivery order #${deliveryOrder.id}`);

  console.log('Supermarket database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
