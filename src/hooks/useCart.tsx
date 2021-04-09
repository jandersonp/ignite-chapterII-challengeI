import { useEffect } from 'react';
import { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {

      /**Atualiza o localStorage*/
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      /**Verificando se o produto existente, 
       * 
       * se product.id === productId, então temos um produto no carrinho */
      const productExists = updatedCart.find(product => product.id === productId);

      /**Verificação do estoque e quantidade em estoque (stockAmount) */
      const stockVerification = await api.get(`/stock/${productId}`)
      const stockAmount = stockVerification.data.amount;

      /**Se o produto existe no carrinho ? (então) pegaremos o amount 
       * senão retornaremos 0 (Carrinho vazinho)
       */
      const currentAmount = productExists ? productExists.amount : 0;

      /**Quantidade desejada */
      const amount = currentAmount + 1;

      //Verificando se quantidade deseja é maior do que a quantidade em estoque
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      /**
       * verificando se o produto existe, 
       * se existir acrescenta uma quatidade do produto no carrinho, 
       * senao adiciona esse produto no carrinho
       */
      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);

        /**Novo produto com uma propriedade amout = 1 */
        const newProduct = {
          ...product.data,
          amount: 1
        }

        /**Adiciona o newProduct no final do array updatedCart */
        updatedCart.push(newProduct);
      }

      /**Atualiza o estado do cart */
      setCart(updatedCart);

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);



      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      /**Verificação do estoque e quantidade em estoque (stockAmount) */
      const stockVerification = await api.get(`/stock/${productId}`);
      const stockAmount = stockVerification.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');

    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
