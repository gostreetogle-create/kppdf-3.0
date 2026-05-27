import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KpProductPickerComponent } from './kp-product-picker.component';
import type { IProduct } from '../../../../../shared/types/product.interface';

describe('KpProductPickerComponent', () => {
  let fixture: ComponentFixture<KpProductPickerComponent>;
  let component: KpProductPickerComponent;

  const mockProduct: IProduct = {
    _id: 'p1',
    name: 'Болт',
    sku: 'BRT-001',
    kind: 'ITEM',
    unit: 'шт',
    status: 'active',
    listPrice: 12,
    stockQty: 100,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpProductPickerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(KpProductPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add to cart in multi mode', () => {
    fixture.componentRef.setInput('multiple', true);
    component.addToCart(mockProduct);
    expect(component.cartCount()).toBe(1);
    component.removeFromCart('p1');
    expect(component.cartCount()).toBe(0);
  });

  it('should emit productsSelected on confirmMulti', () => {
    const emitted: IProduct[][] = [];
    component.productsSelected.subscribe((p) => emitted.push(p));
    component.addToCart(mockProduct);
    component.confirmMulti();
    expect(emitted.length).toBe(1);
    expect(emitted[0][0]._id).toBe('p1');
  });

  it('should emit productSelected on dblclick in single mode', () => {
    fixture.componentRef.setInput('multiple', false);
    const emitted: IProduct[] = [];
    component.productSelected.subscribe((p) => emitted.push(p));
    component.onRowDblClick(mockProduct);
    expect(emitted.length).toBe(1);
    expect(emitted[0].sku).toBe('BRT-001');
  });

  it('cancel should close without emit', () => {
    const emitted: IProduct[][] = [];
    component.productsSelected.subscribe((p) => emitted.push(p));
    component.visible.set(true);
    component.addToCart(mockProduct);
    component.cancel();
    expect(component.visible()).toBeFalse();
    expect(emitted.length).toBe(0);
  });

  it('should block selection when maxSelection reached', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.componentRef.setInput('maxSelection', 1);
    const other: IProduct = { ...mockProduct, _id: 'p2', sku: 'BRT-002', name: 'Гайка' };
    component.addToCart(mockProduct);
    expect(component.isRowDisabled(other)).toBeTrue();
    component.addToCart(other);
    expect(component.cartCount()).toBe(1);
  });

  it('onRowActivate should toggle cart in multi mode', () => {
    fixture.componentRef.setInput('multiple', true);
    component.onRowActivate(mockProduct);
    expect(component.cartCount()).toBe(1);
  });

  it('productDescription should return trimmed text or null', () => {
    expect(component.productDescription({ ...mockProduct, description: '  Кратко  ' })).toBe('Кратко');
    expect(component.productDescription({ ...mockProduct, description: '' })).toBeNull();
    expect(component.productDescription({ ...mockProduct, description: '   ' })).toBeNull();
    expect(component.productDescription(mockProduct)).toBeNull();
  });
});
