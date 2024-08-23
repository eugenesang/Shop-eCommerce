import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Row, Col, ListGroup, Image, Card, Button, Form } from 'react-bootstrap';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Message from '../components/Message';
import Loader from '../components/Loader';
import {
  useDeliverOrderMutation,
  useGetOrderDetailsQuery,
  useGetPaypalClientIdQuery,
  usePayOrderMutation,
  useMarkAsPaidMutation
} from '../slices/ordersApiSlice';

const OrderScreen = () => {
  const { id: orderId } = useParams();

  const {
    data: order,
    refetch,
    isLoading,
    error,
  } = useGetOrderDetailsQuery(orderId);

  const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();
  const [deliverOrder, { isLoading: loadingDeliver }] =
    useDeliverOrderMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();

  const {
    data: paypal,
    isLoading: loadingPayPal,
    error: errorPayPal,
  } = useGetPaypalClientIdQuery();

  useEffect(() => {
    if (!errorPayPal && !loadingPayPal && paypal.clientId && order?.paymentMethod === 'PayPal') {
      const loadPaypalScript = async () => {
        paypalDispatch({
          type: 'resetOptions',
          value: {
            'client-id': paypal.clientId,
            currency: 'USD',
          },
        });
        paypalDispatch({ type: 'setLoadingStatus', value: 'pending' });
      };
      if (order && !order.isPaid) {
        if (!window.paypal) {
          loadPaypalScript();
        }
      }
    }
  }, [errorPayPal, loadingPayPal, order, paypal, paypalDispatch]);

  function onApprove(data, actions) {
    return actions.order.capture().then(async function (details) {
      try {
        console.log({ details });

        await payOrder({ orderId, details });
        refetch();
        toast.success('Order is paid');
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    });
  }

  function onError(err) {
    toast.error(err.message);
  }

  function createOrder(data, actions) {
    return actions.order
      .create({
        purchase_units: [
          {
            amount: { value: order.usdPrice }, // Use the converted USD amount
          },
        ],
      })
      .then((orderID) => {
        return orderID;
      });
  }

  const deliverHandler = async () => {
    await deliverOrder(orderId);
    refetch();
  };

  const [markAsPaid, { isLoading: loadingMarkAsPaid }] = useMarkAsPaidMutation();

  const markAsPaidHandler = async () => {
    try {
      await markAsPaid(orderId);
      refetch();
      toast.success('Order marked as paid by admin');
    } catch (error) {
      toast.error('Failed to mark the order as paid');
    }
  };

  return isLoading ? (
    <Loader />
  ) : error ? (
    <Message variant='danger'>{error.data.message}</Message>
  ) : (
    <>
      <h1>Order {order._id}</h1>
      <Row>
        <Col md={8}>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              <h2>Shipping</h2>
              <p>
                <strong>Name: </strong> {order.user.name}
              </p>
              <p>
                <strong>Email: </strong>{' '}
                <a href={`mailto:${order.user.email}`}>{order.user.email}</a>
              </p>
              <p>
                <strong>Address:</strong>
                {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
                {order.shippingAddress.postalCode},{' '}
                {order.shippingAddress.country}
              </p>
              {order.isDelivered ? (
                <Message variant='success'>
                  Delivered on {order.deliveredAt}
                </Message>
              ) : (
                <Message variant='danger'>Not Delivered</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Payment Method</h2>
              <p>
                <strong>Method: </strong>
                {order.paymentMethod}
              </p>
              {order.isPaid ? (
                <Message variant='success'>Paid on {order.paidAt}</Message>
              ) : (
                <Message variant='danger'>Not Paid</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Order Items</h2>
              {order.orderItems.length === 0 ? (
                <Message>Order is empty</Message>
              ) : (
                <ListGroup variant='flush'>
                  {order.orderItems.map((item, index) => (
                    <ListGroup.Item key={index}>
                      <Row>
                        <Col md={1}>
                          <Image
                            src={item.image}
                            alt={item.name}
                            fluid
                            rounded
                          />
                        </Col>
                        <Col>
                          <Link to={`/product/${item.product}`}>
                            {item.name}
                          </Link>
                        </Col>
                        <Col md={4}>
                          {item.qty} x Ksh. {item.price} = Ksh.{' '}
                          {item.qty * item.price}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col md={4}>
          <Card>
            <ListGroup variant='flush'>
              <ListGroup.Item>
                <h2>Order Summary</h2>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Items</Col>
                  <Col>Ksh. {order.itemsPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Shipping</Col>
                  <Col>Ksh. {order.shippingPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Tax</Col>
                  <Col>Ksh. {order.taxPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Total (KES)</Col>
                  <Col>Ksh. {order.totalPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Total (USD)</Col>
                  <Col>${order.usdPrice}</Col>
                </Row>
              </ListGroup.Item>
              {!order.isPaid && order.paymentMethod === 'PayPal' && (
                <ListGroup.Item>
                  {loadingPay && <Loader />}
                  {isPending ? (
                    <Loader />
                  ) : (
                    <PayPalButtons
                      createOrder={createOrder}
                      onApprove={onApprove}
                      onError={onError}
                    />
                  )}
                </ListGroup.Item>
              )}

              {!order.isPaid && order.paymentMethod === 'Crypto' && (
                <ListGroup.Item>
                  <h4>Pay with Cryptocurrency</h4>
                  <Form.Group>
                    <Form.Label><strong>ETH Address:</strong></Form.Label>
                    <Form.Control
                      type="text"
                      value="0xcFd3935D951162115Be40147DCA0167380b0bCdE"
                      readOnly
                      onClick={(e) => e.target.select()}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label><strong>BTC Address:</strong></Form.Label>
                    <Form.Control
                      type="text"
                      value="bc1q646reyflf2erv5rh6v79xf7jjrjzqhv6gztemk"
                      readOnly
                      onClick={(e) => e.target.select()}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label><strong>USDT Address:</strong></Form.Label>
                    <Form.Control
                      type="text"
                      value="0x39C7E7b14570B028C0bE643853215dC8814F179E"
                      readOnly
                      onClick={(e) => e.target.select()}
                    />
                  </Form.Group>
                  <div className='mt-4'>
                    <p>Contact us for payment info:</p>
                    <ul style={{ listStyleType: 'none' }} className='container'>
                      <li >
                        <i className="fas fa-envelope"></i> <span className='col'><a href="mailto:support@yourdomain.com">support@yourdomain.com</a></span>
                      </li>
                      <li>
                        <i className="fas fa-phone"></i> <span><a href="tel:+123456789">+123456789</a></span>
                      </li>
                    </ul>
                    <p>Reach out to us if you get stuck in any of the payment and ordering steps. Thank you!</p>
                  </div>
                </ListGroup.Item>
              )}

              {loadingDeliver && <Loader />}
              {userInfo && userInfo.isAdmin && !order.isPaid && order.paymentMethod === 'Crypto' && (
                <ListGroup.Item>
                  <Button
                    type='button'
                    className='btn btn-block'
                    onClick={markAsPaidHandler}
                    disabled={loadingMarkAsPaid}
                  >
                    {loadingMarkAsPaid ? 'Marking...' : 'Mark As Paid'}
                  </Button>
                </ListGroup.Item>
              )}

              {userInfo &&
                userInfo.isAdmin &&
                order.isPaid &&
                !order.isDelivered && (
                  <ListGroup.Item>
                    <Button
                      type='button'
                      className='btn btn-block'
                      onClick={deliverHandler}
                    >
                      Mark As Delivered
                    </Button>
                  </ListGroup.Item>
                )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default OrderScreen;