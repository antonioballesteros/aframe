import { Load, Vr } from './pages'
import {
  BrowserRouter as AppRouter,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom'
const Router = (props) => {
  return (
    <AppRouter>
      <Switch>
        <Route
          exact
          path="/"
          render={() => {
            return <Redirect to="/vr/demo" />
          }}
        />
        <Route path="/load" component={Load} {...props} />
        <Route path="/vr/:file" component={Vr} {...props} />
      </Switch>
    </AppRouter>
  )
}

export default Router
